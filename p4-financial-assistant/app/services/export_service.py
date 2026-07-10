import csv
import io

# Maps our Gemini-assigned categories to standard accounting category names +
# an illustrative chart-of-accounts code. Without a real chart of accounts
# these codes are placeholders — callers importing into a live QuickBooks/Xero
# org should remap codes to their own chart.
ACCOUNTING_CATEGORY_MAP: dict[str, dict[str, str]] = {
    "Food": {"name": "Meals & Entertainment", "code": "420"},
    "Rent": {"name": "Rent Expense", "code": "410"},
    "Transport": {"name": "Travel", "code": "430"},
    "Subscriptions": {"name": "Software & Subscriptions", "code": "440"},
    "Income": {"name": "Income", "code": "100"},
    "Shopping": {"name": "Office Supplies", "code": "450"},
    "Utilities": {"name": "Utilities", "code": "460"},
    "Entertainment": {"name": "Entertainment", "code": "470"},
    "Other": {"name": "Miscellaneous", "code": "490"},
    "Uncategorized": {"name": "Uncategorized Expense", "code": "999"},
}


def _accounting_category(category: str | None) -> dict[str, str]:
    return ACCOUNTING_CATEGORY_MAP.get(category or "Uncategorized", ACCOUNTING_CATEGORY_MAP["Uncategorized"])


def _signed_amount(amount: float, type_: str) -> float:
    # Accounting-CSV convention: money out is negative, money in is positive.
    return round(amount, 2) if type_ == "income" else round(-amount, 2)


def build_quickbooks_csv(transactions: list[dict]) -> str:
    """QuickBooks-style import: Date, Description, Amount, Category."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Description", "Amount", "Category"])
    for t in transactions:
        writer.writerow([
            t["date"],
            t["description"],
            _signed_amount(t["amount"], t["type"]),
            _accounting_category(t["category"])["name"],
        ])
    return buffer.getvalue()


def build_xero_csv(transactions: list[dict]) -> str:
    """Xero standard bank-statement import: Date, Amount, Payee, Description,
    Reference, Account Code."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Amount", "Payee", "Description", "Reference", "Account Code"])
    for t in transactions:
        writer.writerow([
            t["date"],
            _signed_amount(t["amount"], t["type"]),
            t["merchant"] or t["description"],
            t["description"],
            f"TXN-{t['id']}",
            _accounting_category(t["category"])["code"],
        ])
    return buffer.getvalue()
