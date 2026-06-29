from fastapi import APIRouter, UploadFile, File, HTTPException
import pymupdf
import pdfplumber
import io

router = APIRouter(prefix="/extract", tags=["extraction"])

@router.post("/raw-text")
async def extract_raw_text(file: UploadFile = File(...)):
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
    
    return {
        "filename": file.filename,
        "char_count": len(text),
        "preview": text[:2000]
    }