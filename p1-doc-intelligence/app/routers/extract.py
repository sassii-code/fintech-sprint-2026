from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, Optional
import json
from app.services.llm_service import extract_structured_data, extract_custom_fields
from app.services.document_service import file_to_text
from app.services.export_service import build_workbook
from app.models.database import get_db, Extraction

# Public demo mode: no authentication. Every visitor shares the same
# extraction history (there's no per-user ownership concept in the
# Extraction model to begin with).
router = APIRouter(prefix="/extract", tags=["extraction"])

class ExportRecord(BaseModel):
    filename: str
    doc_type: Optional[str] = None
    extracted_data: dict[str, Any]

class ExportRequest(BaseModel):
    records: list[ExportRecord]

# ── endpoints ──
@router.post("/raw-text")
async def extract_raw_text(file: UploadFile = File(...)):
    text = await file_to_text(file)
    return {"filename": file.filename, "char_count": len(text), "preview": text[:2000]}

@router.post("/resume")
async def extract_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    text = await file_to_text(file)
    data = extract_structured_data(text, "resume")
    record = Extraction(filename=file.filename, doc_type="resume", extracted_data=json.dumps(data))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "filename": file.filename, "doc_type": "resume", "extracted_data": data}

@router.post("/bank-statement")
async def extract_bank_statement(file: UploadFile = File(...), db: Session = Depends(get_db)):
    text = await file_to_text(file)
    data = extract_structured_data(text, "bank_statement")
    record = Extraction(filename=file.filename, doc_type="bank_statement", extracted_data=json.dumps(data))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "filename": file.filename, "doc_type": "bank_statement", "extracted_data": data}

@router.post("/invoice")
async def extract_invoice(file: UploadFile = File(...), db: Session = Depends(get_db)):
    text = await file_to_text(file)
    data = extract_structured_data(text, "invoice")
    record = Extraction(filename=file.filename, doc_type="invoice", extracted_data=json.dumps(data))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "filename": file.filename, "doc_type": "invoice", "extracted_data": data}

@router.post("/custom")
async def extract_custom(
    file: UploadFile = File(...),
    fields: str = Form(...),
    db: Session = Depends(get_db)
):
    field_list = [f.strip() for f in fields.split(",") if f.strip()]
    if not field_list:
        raise HTTPException(status_code=400, detail="At least one field must be specified")
    text = await file_to_text(file)
    data = extract_custom_fields(text, field_list)
    record = Extraction(filename=file.filename, doc_type="custom", extracted_data=json.dumps(data))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "filename": file.filename, "doc_type": "custom", "extracted_data": data}

@router.post("/auto")
async def extract_auto(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    text = await file_to_text(file)
    text_lower = text.lower()
    if any(w in text_lower for w in ["experience", "education", "skills", "resume", "cv"]):
        doc_type = "resume"
    elif any(w in text_lower for w in ["transaction", "debit", "credit", "balance", "account"]):
        doc_type = "bank_statement"
    elif any(w in text_lower for w in ["invoice", "bill", "payment due", "total amount"]):
        doc_type = "invoice"
    else:
        doc_type = "general"
    data = extract_structured_data(text, doc_type)
    record = Extraction(filename=file.filename, doc_type=doc_type, extracted_data=json.dumps(data))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "filename": file.filename, "doc_type": doc_type, "extracted_data": data}
@router.post("/export")
async def export_extraction(request: ExportRequest):
    if not request.records:
        raise HTTPException(status_code=400, detail="No records to export")

    records = [r.model_dump() for r in request.records]
    buffer = build_workbook(records)

    filename = "extraction-export.xlsx" if len(records) > 1 else f"{records[0]['filename']}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/history")
async def get_history(db: Session = Depends(get_db)):
    records = db.query(Extraction).order_by(Extraction.created_at.desc()).limit(20).all()
    return [{"id": r.id, "filename": r.filename, "doc_type": r.doc_type, "created_at": r.created_at} for r in records]

@router.get("/history/{id}")
async def get_extraction(id: int, db: Session = Depends(get_db)):
    record = db.query(Extraction).filter(Extraction.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Extraction not found")
    return {"id": record.id, "filename": record.filename, "doc_type": record.doc_type,
            "extracted_data": json.loads(record.extracted_data), "created_at": record.created_at}