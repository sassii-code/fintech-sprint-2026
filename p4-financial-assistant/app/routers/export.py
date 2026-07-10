from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.models.database import get_db, Account, Transaction
from app.services.auth_service import verify_token
from app.services.export_service import build_quickbooks_csv, build_xero_csv

router = APIRouter(prefix="/export", tags=["export"], dependencies=[Depends(verify_token)])

SUPPORTED_FORMATS = {"quickbooks": build_quickbooks_csv, "xero": build_xero_csv}


@router.get("/accounting")
def export_accounting(
    format: str = Query(..., description="Target accounting format: 'quickbooks' or 'xero'"),
    date_from: date | None = Query(None, description="Inclusive start date filter (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="Inclusive end date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Export categorized transactions as a CSV formatted for import into
    QuickBooks or Xero. Categories are mapped from the Gemini-assigned
    categories to standard accounting category names/codes."""
    format_key = format.strip().lower()
    builder = SUPPORTED_FORMATS.get(format_key)
    if builder is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{format}'. Supported: {', '.join(sorted(SUPPORTED_FORMATS))}"
        )

    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from must be on or before date_to")

    query = (
        db.query(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .filter(Account.client_id == token["client_id"])
    )
    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)

    rows = query.order_by(Transaction.date.asc()).all()
    if not rows:
        raise HTTPException(status_code=404, detail="No transactions found for the given filters")

    transactions = [{
        "id": t.id,
        "date": t.date.isoformat(),
        "description": t.description,
        "amount": t.amount,
        "type": t.type,
        "category": t.category,
        "merchant": t.merchant,
    } for t in rows]

    csv_content = builder(transactions)
    filename = f"transactions-{format_key}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
