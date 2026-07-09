from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db, Account, Transaction
from app.services.auth_service import verify_token
from app.services.file_service import parse_transaction_file
from app.services.llm_service import categorize_transactions

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


@router.get("/{id}")
def get_transaction(id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    record = (
        db.query(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .filter(Transaction.id == id, Account.client_id == token["client_id"])
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _serialize(record)
