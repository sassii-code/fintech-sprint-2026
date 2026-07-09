import pandas as pd
from sqlalchemy.orm import Session
from app.models.database import Account, Transaction

ANOMALY_STDDEV_THRESHOLD = 2.0


def get_client_transactions_df(db: Session, client_id: str) -> pd.DataFrame:
    rows = (
        db.query(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .filter(Account.client_id == client_id)
        .all()
    )
    if not rows:
        return pd.DataFrame(columns=["id", "date", "description", "amount", "type", "category", "merchant"])

    return pd.DataFrame([{
        "id": r.id,
        "date": pd.to_datetime(r.date),
        "description": r.description,
        "amount": r.amount,
        "type": r.type,
        "category": r.category or "Uncategorized",
        "merchant": r.merchant,
    } for r in rows])


def spending_by_category(df: pd.DataFrame) -> list[dict]:
    expenses = df[df["type"] == "expense"]
    if expenses.empty:
        return []
    grouped = expenses.groupby("category")["amount"].agg(["sum", "count"]).reset_index()
    grouped = grouped.sort_values("sum", ascending=False)
    return [
        {"category": row["category"], "total": round(row["sum"], 2), "count": int(row["count"])}
        for _, row in grouped.iterrows()
    ]


def monthly_trends(df: pd.DataFrame) -> list[dict]:
    if df.empty:
        return []
    working = df.copy()
    working["month"] = working["date"].dt.to_period("M").astype(str)
    income = working[working["type"] == "income"].groupby("month")["amount"].sum()
    expenses = working[working["type"] == "expense"].groupby("month")["amount"].sum()
    months = sorted(set(income.index) | set(expenses.index))
    return [
        {
            "month": m,
            "income": round(float(income.get(m, 0)), 2),
            "expenses": round(float(expenses.get(m, 0)), 2),
            "net": round(float(income.get(m, 0)) - float(expenses.get(m, 0)), 2),
        }
        for m in months
    ]


def income_vs_expenses(df: pd.DataFrame) -> dict:
    total_income = round(float(df[df["type"] == "income"]["amount"].sum()), 2)
    total_expenses = round(float(df[df["type"] == "expense"]["amount"].sum()), 2)
    net = round(total_income - total_expenses, 2)
    savings_rate = round(net / total_income, 4) if total_income > 0 else None
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net": net,
        "savings_rate": savings_rate,
    }


def top_merchants(df: pd.DataFrame, limit: int = 10) -> list[dict]:
    expenses = df[(df["type"] == "expense") & df["merchant"].notna() & (df["merchant"] != "")]
    if expenses.empty:
        return []
    grouped = expenses.groupby("merchant")["amount"].agg(["sum", "count"]).reset_index()
    grouped = grouped.sort_values("sum", ascending=False).head(limit)
    return [
        {"merchant": row["merchant"], "total": round(row["sum"], 2), "count": int(row["count"])}
        for _, row in grouped.iterrows()
    ]


def detect_anomalies(df: pd.DataFrame, threshold: float = ANOMALY_STDDEV_THRESHOLD) -> list[dict]:
    expenses = df[df["type"] == "expense"]
    if len(expenses) < 2:
        return []

    mean = expenses["amount"].mean()
    stddev = expenses["amount"].std()
    if not stddev or pd.isna(stddev):
        return []

    cutoff = mean + threshold * stddev
    flagged = expenses[expenses["amount"] > cutoff].sort_values("amount", ascending=False)

    return [
        {
            "id": int(row["id"]),
            "date": row["date"].date().isoformat(),
            "description": row["description"],
            "amount": round(float(row["amount"]), 2),
            "category": row["category"],
            "average": round(float(mean), 2),
            "std_dev": round(float(stddev), 2),
            "z_score": round((row["amount"] - mean) / stddev, 2),
        }
        for _, row in flagged.iterrows()
    ]


def build_summary(df: pd.DataFrame) -> dict:
    return {
        "spending_by_category": spending_by_category(df),
        "monthly_trends": monthly_trends(df),
        "income_vs_expenses": income_vs_expenses(df),
        "top_merchants": top_merchants(df, limit=5),
        "anomalies": detect_anomalies(df),
        "transaction_count": int(len(df)),
    }
