import pandas as pd
from app.services import analytics_service

# Weights per spec — must sum to 1.0
WEIGHT_SAVINGS_RATE = 0.35
WEIGHT_CONSISTENCY = 0.25
WEIGHT_EXPENSE_RATIO = 0.25
WEIGHT_BUFFER = 0.15

TARGET_SAVINGS_RATE = 0.20  # 20% savings rate maps to a full component score
TARGET_BUFFER_MONTHS = 6.0  # 6 months of expenses covered maps to a full component score


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _savings_rate_component(income_vs_expenses: dict) -> dict:
    total_income = income_vs_expenses["total_income"]
    savings_rate = income_vs_expenses["savings_rate"]
    if total_income <= 0 or savings_rate is None:
        return {"value": savings_rate, "score": 0.0}
    score = _clamp((savings_rate / TARGET_SAVINGS_RATE) * 100)
    return {"value": round(savings_rate, 4), "score": round(score, 1)}


def _consistency_component(monthly: list[dict]) -> dict:
    expense_totals = [m["expenses"] for m in monthly]
    if len(expense_totals) < 2:
        # Not enough months to measure variance — neutral score rather than
        # punishing/rewarding a brand-new account with sparse data.
        return {"value": None, "score": 50.0}

    mean = sum(expense_totals) / len(expense_totals)
    if mean <= 0:
        return {"value": None, "score": 50.0}

    variance = sum((x - mean) ** 2 for x in expense_totals) / len(expense_totals)
    stddev = variance ** 0.5
    coefficient_of_variation = stddev / mean
    score = _clamp((1 - coefficient_of_variation) * 100)
    return {"value": round(coefficient_of_variation, 4), "score": round(score, 1)}


def _expense_ratio_component(income_vs_expenses: dict) -> dict:
    total_income = income_vs_expenses["total_income"]
    total_expenses = income_vs_expenses["total_expenses"]
    if total_income <= 0:
        return {"value": None, "score": 0.0}
    ratio = total_expenses / total_income
    score = _clamp((1 - ratio) * 100)
    return {"value": round(ratio, 4), "score": round(score, 1)}


def _buffer_component(df: pd.DataFrame, monthly: list[dict]) -> dict:
    """Emergency-fund proxy: we don't have real bank balances, so we approximate
    'balance' as the running cumulative net (income - expenses) over the
    transaction timeline, then express its average as a number of months of
    average expense coverage."""
    if df.empty or not monthly:
        return {"value": None, "score": 0.0}

    avg_monthly_expense = sum(m["expenses"] for m in monthly) / len(monthly)
    if avg_monthly_expense <= 0:
        return {"value": None, "score": 100.0}  # no expenses recorded, nothing to buffer against

    working = df.copy().sort_values("date")
    working["signed_amount"] = working.apply(
        lambda r: r["amount"] if r["type"] == "income" else -r["amount"], axis=1
    )
    running_balance = working["signed_amount"].cumsum()
    avg_balance = float(running_balance.mean())

    months_of_buffer = avg_balance / avg_monthly_expense
    score = _clamp((months_of_buffer / TARGET_BUFFER_MONTHS) * 100)
    return {"value": round(months_of_buffer, 2), "score": round(score, 1)}


def compute_health_score(df: pd.DataFrame) -> dict:
    """Returns {"score": int, "breakdown": {...}} — no LLM call here, that's
    layered on separately so this stays fast and testable in isolation."""
    monthly = analytics_service.monthly_trends(df)
    income_vs_expenses = analytics_service.income_vs_expenses(df)

    savings = _savings_rate_component(income_vs_expenses)
    consistency = _consistency_component(monthly)
    expense_ratio = _expense_ratio_component(income_vs_expenses)
    buffer = _buffer_component(df, monthly)

    weighted_total = (
        savings["score"] * WEIGHT_SAVINGS_RATE
        + consistency["score"] * WEIGHT_CONSISTENCY
        + expense_ratio["score"] * WEIGHT_EXPENSE_RATIO
        + buffer["score"] * WEIGHT_BUFFER
    )

    return {
        "score": round(_clamp(weighted_total)),
        "breakdown": {
            "savings_rate": savings,
            "consistency": consistency,
            "expense_ratio": expense_ratio,
            "buffer": buffer,
        },
    }
