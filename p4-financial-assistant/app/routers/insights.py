from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.database import get_db, HealthScoreCache
from app.services.auth_service import verify_token
from app.services import analytics_service, health_score_service
from app.services.llm_service import answer_question, explain_health_score

router = APIRouter(prefix="/insights", tags=["insights"], dependencies=[Depends(verify_token)])


class QueryRequest(BaseModel):
    question: str


RECENT_TRANSACTIONS_FOR_QUERY = 150
HEALTH_SCORE_EXPLANATION_TTL = timedelta(hours=24)


@router.post("/query")
def query_insights(request: QueryRequest, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Ask a natural-language question about your own transaction history
    (e.g. "How much did I spend on food last month?"). Answered entirely from
    your stored data — the model is instructed not to guess or invent numbers
    when the data can't support a confident answer."""
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question must not be empty")

    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    if df.empty:
        return {
            "question": question,
            "answer": "You don't have any transactions on file yet, so I can't answer that. Upload some transactions first.",
            "data_used": {},
        }

    summary = analytics_service.build_summary(df)
    recent = (
        df.sort_values("date", ascending=False)
        .head(RECENT_TRANSACTIONS_FOR_QUERY)[["date", "description", "amount", "type", "category", "merchant"]]
        .assign(date=lambda d: d["date"].dt.date.astype(str))
        .to_dict(orient="records")
    )
    data_used = {**summary, "recent_transactions": recent}

    result = answer_question(question, data_used)
    return {"question": question, "answer": result["answer"], "data_used": data_used}


@router.get("/health-score")
def health_score(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Financial health score (0-100), weighted from savings rate (35%),
    month-to-month spending consistency (25%), expense-to-income ratio (25%),
    and an emergency-fund buffer proxy (15%). Includes an AI-generated
    explanation and one actionable suggestion.

    The score/breakdown are cheap and deterministic, so they're recomputed
    fresh on every call. The AI explanation is the expensive part (one Gemini
    call), so it's cached per client and only regenerated once every 24
    hours — the free tier caps at 20 requests/day, and dashboard loads would
    blow through that in minutes otherwise."""
    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    if df.empty:
        raise HTTPException(status_code=404, detail="No transaction data available to compute a health score")

    result = health_score_service.compute_health_score(df)
    client_id = token["client_id"]
    now = datetime.utcnow()

    cache = db.query(HealthScoreCache).filter(HealthScoreCache.client_id == client_id).first()
    is_fresh = cache is not None and (now - cache.computed_at) < HEALTH_SCORE_EXPLANATION_TTL

    if is_fresh:
        explanation = cache.explanation
    else:
        try:
            explanation = explain_health_score(result["score"], result["breakdown"])
        except HTTPException:
            # LLM call failed (e.g. rate limit) — serve a stale cached
            # explanation rather than erroring out, if we have one at all.
            if cache is not None:
                explanation = cache.explanation
            else:
                raise
        else:
            if cache is not None:
                cache.score = result["score"]
                cache.breakdown = result["breakdown"]
                cache.explanation = explanation
                cache.computed_at = now
            else:
                cache = HealthScoreCache(
                    client_id=client_id,
                    score=result["score"],
                    breakdown=result["breakdown"],
                    explanation=explanation,
                    computed_at=now,
                )
                db.add(cache)
            db.commit()

    return {
        "score": result["score"],
        "breakdown": result["breakdown"],
        "explanation": explanation,
        "explanation_updated_at": cache.computed_at.isoformat() if cache else now.isoformat(),
    }
