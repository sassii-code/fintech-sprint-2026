import random
from datetime import date
from sqlalchemy.orm import Session
from app.models.database import Account, Transaction
from app.services.auth_service import DEMO_CLIENT_ID

DEMO_ACCOUNT_NAME = "Demo Checking"
DEMO_MONTHS = 6

_GROCERY_MERCHANTS = ["Whole Foods Market", "Trader Joe's", "Safeway"]
_DINING_MERCHANTS = ["Chipotle", "Starbucks", "Local Bistro", "Domino's Pizza"]
_TRANSPORT_MERCHANTS = ["Uber", "Shell Gas Station", "Metro Transit Authority"]
_SHOPPING_MERCHANTS = ["Amazon", "Target", "Best Buy"]
_UTILITIES = [("Con Edison", 95, 140), ("Comcast Xfinity", 70, 90), ("Verizon Wireless", 60, 85)]
_ENTERTAINMENT_MERCHANTS = ["AMC Theatres", "Steam", "Ticketmaster"]
_SUBSCRIPTIONS = [("Netflix", 15.49, 12), ("Spotify", 10.99, 18), ("Anytime Fitness", 39.99, 20)]


def _year_month(base_year: int, base_month: int, offset: int) -> tuple[int, int]:
    total = base_month - 1 + offset
    return base_year + total // 12, total % 12 + 1


def _txn(year: int, month: int, day: int, description: str, amount: float, type_: str, category: str, merchant: str) -> dict:
    return {
        "date": date(year, month, max(1, min(day, 28))),
        "description": description,
        "amount": round(amount, 2),
        "type": type_,
        "category": category,
        "merchant": merchant,
    }


def _generate_demo_transactions() -> list[dict]:
    """~6 months of realistic-looking transactions: a monthly paycheck and
    rent, a few recurring subscriptions (fixed day-of-month, near-fixed
    amount, so the fuzzy recurring-transaction detector actually picks them
    up), everyday category spending with natural variation across months,
    and a couple of one-off large purchases so anomaly detection has
    something to flag."""
    rng = random.Random(42)
    today = date.today()
    start_year, start_month = _year_month(today.year, today.month, -(DEMO_MONTHS - 1))

    txns = []
    for offset in range(DEMO_MONTHS):
        year, month = _year_month(start_year, start_month, offset)

        txns.append(_txn(year, month, 1, "Acme Corp Payroll", 4820 + rng.uniform(-40, 40), "income", "Income", "Acme Corp"))
        txns.append(_txn(year, month, 3, "Maple Street Apartments Rent", 1450, "expense", "Rent", "Maple Street Apartments"))

        for name, amount, day in _SUBSCRIPTIONS:
            jitter_day = max(1, min(28, day + rng.randint(-1, 1)))
            txns.append(_txn(year, month, jitter_day, f"{name} Subscription", amount, "expense", "Subscriptions", name))

        for _ in range(rng.randint(4, 6)):
            merchant = rng.choice(_GROCERY_MERCHANTS)
            txns.append(_txn(year, month, rng.randint(1, 28), merchant, rng.uniform(35, 120), "expense", "Food", merchant))

        for _ in range(rng.randint(3, 5)):
            merchant = rng.choice(_DINING_MERCHANTS)
            txns.append(_txn(year, month, rng.randint(1, 28), merchant, rng.uniform(8, 45), "expense", "Food", merchant))

        for _ in range(rng.randint(5, 8)):
            merchant = rng.choice(_TRANSPORT_MERCHANTS)
            txns.append(_txn(year, month, rng.randint(1, 28), merchant, rng.uniform(10, 60), "expense", "Transport", merchant))

        for _ in range(rng.randint(2, 4)):
            merchant = rng.choice(_SHOPPING_MERCHANTS)
            txns.append(_txn(year, month, rng.randint(1, 28), merchant, rng.uniform(20, 180), "expense", "Shopping", merchant))

        for merchant, lo, hi in _UTILITIES:
            txns.append(_txn(year, month, rng.randint(1, 28), merchant, rng.uniform(lo, hi), "expense", "Utilities", merchant))

        for _ in range(rng.randint(1, 3)):
            merchant = rng.choice(_ENTERTAINMENT_MERCHANTS)
            txns.append(_txn(year, month, rng.randint(1, 28), merchant, rng.uniform(12, 70), "expense", "Entertainment", merchant))

    anomaly_year, anomaly_month = _year_month(start_year, start_month, DEMO_MONTHS - 2)
    txns.append(_txn(anomaly_year, anomaly_month, 14, "AutoZone Care - Transmission Repair", 2150.00, "expense", "Transport", "AutoZone Care"))
    last_year, last_month = _year_month(start_year, start_month, DEMO_MONTHS - 1)
    txns.append(_txn(last_year, last_month, 22, "Best Buy - New Laptop", 1899.00, "expense", "Shopping", "Best Buy"))

    return txns


def seed_demo_account(db: Session) -> None:
    """Populates the shared public-demo account with realistic transactions
    so the dashboard shows real-looking charts/insights instead of an empty
    state. No-op if the demo account already has data (whether from a prior
    seed or from a visitor uploading their own file) — never overwrites."""
    existing = db.query(Account).filter(Account.client_id == DEMO_CLIENT_ID).first()
    if existing:
        return

    account = Account(client_id=DEMO_CLIENT_ID, name=DEMO_ACCOUNT_NAME)
    db.add(account)
    db.commit()
    db.refresh(account)

    for row in _generate_demo_transactions():
        db.add(Transaction(account_id=account.id, **row))
    db.commit()
