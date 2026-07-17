import io
import pandas as pd
from fastapi import HTTPException, UploadFile
from app.services.llm_service import extract_transactions_from_pdf

REQUIRED_COLUMNS = {"date", "description", "amount", "type"}
TYPE_ALIASES = {
    "income": "income",
    "expense": "expense",
    "credit": "income",
    "debit": "expense",
}


def _read_dataframe(ext: str, contents: bytes) -> pd.DataFrame:
    try:
        if ext == "csv":
            return pd.read_csv(io.BytesIO(contents))
        return pd.read_excel(io.BytesIO(contents))  # xlsx/xls
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read file — it may be corrupted or malformed")


def _rows_from_dataframe(df: pd.DataFrame) -> list[tuple[str, dict]]:
    df.columns = [str(c).strip().lower() for c in df.columns]

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required column(s): {', '.join(sorted(missing))}. Expected: date, description, amount, type"
        )

    df = df.dropna(how="all")
    if df.empty:
        raise HTTPException(status_code=422, detail="File contains no transaction rows")

    return [
        (f"Row {i + 2}", {"date": row["date"], "description": row["description"], "amount": row["amount"], "type": row["type"]})
        for i, row in df.iterrows()
    ]


def _rows_from_pdf(contents: bytes) -> list[tuple[str, dict]]:
    extracted = extract_transactions_from_pdf(contents)
    if not extracted:
        raise HTTPException(status_code=422, detail="No transactions could be extracted from this PDF")

    return [
        (f"Transaction {i + 1}", {
            "date": item.get("date") if isinstance(item, dict) else None,
            "description": item.get("description") if isinstance(item, dict) else None,
            "amount": item.get("amount") if isinstance(item, dict) else None,
            "type": item.get("type") if isinstance(item, dict) else None,
        })
        for i, item in enumerate(extracted)
    ]


def _normalize_row(label: str, raw: dict) -> dict:
    raw_date = raw.get("date")
    try:
        date_value = pd.to_datetime(raw_date).date().isoformat()
    except Exception:
        raise HTTPException(status_code=422, detail=f"{label}: invalid date '{raw_date}'")

    raw_amount = raw.get("amount")
    try:
        # `type` is the sole source of direction throughout this system —
        # normalize to a positive magnitude here so a source that signs its
        # amounts (negative for expenses) doesn't corrupt every downstream
        # sum-by-type (savings rate, expense ratio, etc. all assume magnitude).
        amount_value = abs(float(raw_amount))
    except Exception:
        raise HTTPException(status_code=422, detail=f"{label}: invalid amount '{raw_amount}'")

    raw_type = str(raw.get("type") or "").strip().lower()
    type_value = TYPE_ALIASES.get(raw_type)
    if type_value is None:
        raise HTTPException(
            status_code=422,
            detail=f"{label}: invalid type '{raw.get('type')}' — must be one of 'income', 'expense', 'credit', 'debit'"
        )

    description_value = str(raw.get("description") or "").strip()
    if not description_value or description_value.lower() == "nan":
        raise HTTPException(status_code=422, detail=f"{label}: description is empty")

    return {
        "date": date_value,
        "description": description_value,
        "amount": amount_value,
        "type": type_value,
    }


async def parse_transaction_file(file: UploadFile) -> list[dict]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""

    if ext == "pdf":
        labeled_rows = _rows_from_pdf(contents)
    elif ext in ("csv", "xlsx", "xls"):
        labeled_rows = _rows_from_dataframe(_read_dataframe(ext, contents))
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '.{ext}'. Supported: .csv, .xlsx, .xls, .pdf")

    return [_normalize_row(label, raw) for label, raw in labeled_rows]
