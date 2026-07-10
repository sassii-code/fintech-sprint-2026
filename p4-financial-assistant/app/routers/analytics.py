from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.services.auth_service import verify_token
from app.services import analytics_service
from app.services.llm_service import generate_insights

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(verify_token)])


@router.get("/spending-by-category")
def spending_by_category(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Total and transaction count per category, expenses only, sorted descending."""
    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    return analytics_service.spending_by_category(df)


@router.get("/monthly-trends")
def monthly_trends(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Income, expenses, and net total per calendar month."""
    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    return analytics_service.monthly_trends(df)


@router.get("/income-vs-expenses")
def income_vs_expenses(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """All-time totals: total income, total expenses, net, and savings rate."""
    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    return analytics_service.income_vs_expenses(df)


@router.get("/top-merchants")
def top_merchants(limit: int = 10, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Top merchants by total spend (expenses only, merchant must be known)."""
    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    return analytics_service.top_merchants(df, limit=limit)


@router.get("/anomalies")
def anomalies(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Expense transactions more than 2 standard deviations above the mean
    expense amount, with average, std_dev, and z_score per flagged transaction."""
    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    return analytics_service.detect_anomalies(df)


@router.post("/insights")
def insights(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Builds a spending/income/anomaly summary and sends it to Gemini for
    natural-language financial advice. Returns both the advice and the raw
    summary it was based on."""
    df = analytics_service.get_client_transactions_df(db, token["client_id"])
    summary = analytics_service.build_summary(df)
    advice = generate_insights(summary)
    return {"insights": advice, "summary": summary}
