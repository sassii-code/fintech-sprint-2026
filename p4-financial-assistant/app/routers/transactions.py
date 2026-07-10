from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db, Account, Transaction
from app.services.auth_service import verify_token
from app.services.file_service import parse_transaction_file
from app.services.llm_service import categorize_transactions
from app.services.recurring_service import detect_recurring

router = APIRouter(prefix="/transactions", tags=["transactions"], dependencies=[Depends(verify_token)])


def _get_or_create_account(db: Session, client_id: str, name: str) -> Account:
    account = db.query(Account).filter(Account.client_id == client_id, Account.name == name).first()
    if account:
        return account
    account = Account(client_id=client_id, name=name)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def _serialize(t: Transaction) -> dict:
    return {
        "id": t.id,
        "account_id": t.account_id,
        "date": t.date.isoformat(),
        "description": t.description,
        "amount": t.amount,
        "type": t.type,
        "category": t.category,
        "merchant": t.merchant,
        "created_at": t.created_at,
    }


@router.post("/upload")
async def upload_transactions(
    file: UploadFile = File(...),
    account_name: str = Form("Default Account"),
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Upload a CSV or Excel file of transactions (date, description, amount,
    type columns) and get back each one auto-categorized by Gemini, stored
    under the given (or default) account."""
    client_id = token["client_id"]
    rows = await parse_transaction_file(file)
    categorized = categorize_transactions(rows)

    account = _get_or_create_account(db, client_id, account_name)

    records = []
    for row, tag in zip(rows, categorized):
        record = Transaction(
            account_id=account.id,
            date=row["date"],
            description=row["description"],
            amount=row["amount"],
            type=row["type"],
            category=tag.get("category"),
            merchant=tag.get("merchant"),
        )
        db.add(record)
        records.append(record)

    db.commit()
    for r in records:
        db.refresh(r)

    return {
        "account_id": account.id,
        "account_name": account.name,
        "uploaded_count": len(records),
        "transactions": [_serialize(r) for r in records],
    }


@router.get("/accounts")
def list_accounts(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """List the authenticated client's accounts."""
    accounts = db.query(Account).filter(Account.client_id == token["client_id"]).order_by(Account.created_at.desc()).all()
    return [{"id": a.id, "name": a.name, "created_at": a.created_at} for a in accounts]


@router.get("")
def list_transactions(
    account_id: int | None = None,
    category: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """List transactions, most recent first. Optionally filter by account_id
    and/or category."""
    query = (
        db.query(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .filter(Account.client_id == token["client_id"])
    )
    if account_id is not None:
        query = query.filter(Transaction.account_id == account_id)
    if category is not None:
        query = query.filter(Transaction.category == category)

    rows = query.order_by(Transaction.date.desc()).limit(min(limit, 500)).all()
    return [_serialize(r) for r in rows]


@router.get("/recurring")
def get_recurring_transactions(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Detects recurring transactions (subscriptions, rent, paycheck, etc.) by
    fuzzy-matching similar descriptions (rapidfuzz) with amounts within 5% of
    each other, then checking whether the intervals between occurrences are
    consistently weekly/monthly/yearly. Results are persisted to the
    recurring_transactions table (replacing this client's previous results)
    so other consumers can read them without re-running detection themselves.
    Recomputed fresh on every call so newly uploaded transactions are picked up."""
    results = detect_recurring(db, token["client_id"])
    return [
        {
            "account_id": r["account_id"],
            "merchant": r["merchant"],
            "amount": r["amount"],
            "type": r["type"],
            "frequency": r["frequency"],
            "occurrence_count": r["occurrence_count"],
            "last_seen_date": r["last_seen_date"].isoformat(),
            "next_expected_date": r["next_expected_date"].isoformat(),
            "total_spent_lifetime": r["total_spent_lifetime"],
            "transaction_ids": [int(x) for x in r["transaction_ids"].split(",")],
        }
        for r in results
    ]


@router.get("/{id}")
def get_transaction(id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Get a single transaction by id. 404 if it doesn't exist or isn't owned
    by the authenticated client."""
    record = (
        db.query(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .filter(Transaction.id == id, Account.client_id == token["client_id"])
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _serialize(record)
