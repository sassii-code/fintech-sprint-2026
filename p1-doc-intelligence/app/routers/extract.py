from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import pymupdf
import pdfplumber
import io
import json
from app.services.llm_service import extract_structured_data
from app.models.database import get_db, Extraction
from app.services.auth_service import verify_token
router = APIRouter(prefix="/extract", tags=["extraction"], dependencies=[Depends(verify_token)])

# ── shared helper ──
async def pdf_to_text(file: UploadFile) -> str:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    text = ""
    try:
        doc = pymupdf.open(stream=contents, filetype="pdf")
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception:
        try:
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
        except Exception:
            raise HTTPException(status_code=422, detail="Could not read PDF — file may be corrupted or malformed")

    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")
    return text

# ── endpoints ──
@router.post("/raw-text")
async def extract_raw_text(file: UploadFile = File(...)):
    text = await pdf_to_text(file)
    return {"filename": file.filename, "char_count": len(text), "preview": text[:2000]}

@router.post("/resume")
async def extract_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    text = await pdf_to_text(file)
    data = extract_structured_data(text, "resume")
    record = Extraction(filename=file.filename, doc_type="resume", extracted_data=json.dumps(data))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "filename": file.filename, "doc_type": "resume", "extracted_data": data}

@router.post("/bank-statement")
async def extract_bank_statement(file: UploadFile = File(...), db: Session = Depends(get_db)):
    text = await pdf_to_text(file)
    data = extract_structured_data(text, "bank_statement")
    record = Extraction(filename=file.filename, doc_type="bank_statement", extracted_data=json.dumps(data))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "filename": file.filename, "doc_type": "bank_statement", "extracted_data": data}

@router.post("/invoice")
async def extract_invoice(file: UploadFile = File(...), db: Session = Depends(get_db)):
    text = await pdf_to_text(file)
    data = extract_structured_data(text, "invoice")
    record = Extraction(filename=file.filename, doc_type="invoice", extracted_data=json.dumps(data))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "filename": file.filename, "doc_type": "invoice", "extracted_data": data}

@router.post("/auto")
async def extract_auto(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    text = await pdf_to_text(file)
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