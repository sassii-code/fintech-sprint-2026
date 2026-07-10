from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.services.auth_service import verify_token
from app.services import analytics_service, health_score_service
from app.services.llm_service import answer_question, explain_health_score

router = APIRouter(prefix="/insights", tags=["insights"], dependencies=[Depends(verify_token)])


class QueryRequest(BaseModel):
    question: str


RECENT_TRANSACTIONS_FOR_QUERY = 150


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
    explanation and one actionable suggestion."""
    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    if df.empty:
        raise HTTPException(status_code=404, detail="No transaction data available to compute a health score")

    result = health_score_service.compute_health_score(df)
    explanation = explain_health_score(result["score"], result["breakdown"])

    return {
        "score": result["score"],
        "breakdown": result["breakdown"],
        "explanation": explanation,
    }
