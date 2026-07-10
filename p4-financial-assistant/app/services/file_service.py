import io
import pandas as pd
from fastapi import HTTPException, UploadFile

REQUIRED_COLUMNS = {"date", "description", "amount", "type"}
TYPE_ALIASES = {
    "income": "income",
    "expense": "expense",
    "credit": "income",
    "debit": "expense",
}


def _read_dataframe(filename: str, contents: bytes) -> pd.DataFrame:
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    try:
        if ext == "csv":
            return pd.read_csv(io.BytesIO(contents))
        if ext in ("xlsx", "xls"):
            return pd.read_excel(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read file — it may be corrupted or malformed")

    raise HTTPException(status_code=400, detail=f"Unsupported file type '.{ext}'. Supported: .csv, .xlsx, .xls")


async def parse_transaction_file(file: UploadFile) -> list[dict]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    df = _read_dataframe(file.filename, contents)
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

    rows = []
    for i, row in df.iterrows():
        try:
            date_value = pd.to_datetime(row["date"]).date().isoformat()
        except Exception:
            raise HTTPException(status_code=422, detail=f"Row {i + 2}: invalid date '{row['date']}'")

        try:
            # `type` is the sole source of direction throughout this system —
            # normalize to a positive magnitude here so a source file that
            # signs its amounts (negative for expenses) doesn't corrupt every
            # downstream sum-by-type (savings rate, expense ratio, etc. all
            # assume magnitude, not signed values).
            amount_value = abs(float(row["amount"]))
        except Exception:
            raise HTTPException(status_code=422, detail=f"Row {i + 2}: invalid amount '{row['amount']}'")

        raw_type = str(row["type"]).strip().lower()
        type_value = TYPE_ALIASES.get(raw_type)
        if type_value is None:
            raise HTTPException(
                status_code=422,
                detail=f"Row {i + 2}: invalid type '{row['type']}' — must be one of 'income', 'expense', 'credit', 'debit'"
            )

        description_value = str(row["description"]).strip()
        if not description_value or description_value.lower() == "nan":
            raise HTTPException(status_code=422, detail=f"Row {i + 2}: description is empty")

        rows.append({
            "date": date_value,
            "description": description_value,
            "amount": amount_value,
            "type": type_value,
        })

    return rows
