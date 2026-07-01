from fastapi import APIRouter, UploadFile, File, HTTPException
import pymupdf
import pdfplumber
import io
from app.services.llm_service import extract_structured_data

router = APIRouter(prefix="/extract", tags=["extraction"])

# ── shared helper ──
async def pdf_to_text(file: UploadFile) -> str:
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")
    contents = await file.read()
    text = ""
    try:
        doc = pymupdf.open(stream=contents, filetype="pdf")
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception:
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")
    return text

# ── endpoints ──
@router.post("/raw-text")
async def extract_raw_text(file: UploadFile = File(...)):
    text = await pdf_to_text(file)
    return {"filename": file.filename, "char_count": len(text), "preview": text[:2000]}

@router.post("/resume")
async def extract_resume(file: UploadFile = File(...)):
    text = await pdf_to_text(file)
    return {"filename": file.filename, "doc_type": "resume",
            "extracted_data": extract_structured_data(text, "resume")}

@router.post("/bank-statement")
async def extract_bank_statement(file: UploadFile = File(...)):
    text = await pdf_to_text(file)
    return {"filename": file.filename, "doc_type": "bank_statement",
            "extracted_data": extract_structured_data(text, "bank_statement")}

@router.post("/invoice")
async def extract_invoice(file: UploadFile = File(...)):
    text = await pdf_to_text(file)
    return {"filename": file.filename, "doc_type": "invoice",
            "extracted_data": extract_structured_data(text, "invoice")}

@router.post("/auto")
async def extract_auto(file: UploadFile = File(...)):
    """Auto-detects document type and extracts accordingly"""
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

    return {"filename": file.filename, "doc_type": doc_type,
            "extracted_data": extract_structured_data(text, doc_type)}