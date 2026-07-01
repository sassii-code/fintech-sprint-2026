from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from datetime import datetime

app = FastAPI(
    title="AI Document Intelligence API",
    description="Extract structured JSON from financial documents",
    version="0.1.0"
)

from app.routers import extract
app.include_router(extract.router)

@app.get("/")
def root():
    return {
        "status": "running",
        "project": "AI Document Intelligence API",
        "version": "0.1.0",
        "time": str(datetime.now())
    }

@app.get("/health")
def health():
    return {"api": "ok", "db": "pending", "llm": "pending"}