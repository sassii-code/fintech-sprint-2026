from fastapi import FastAPI
from datetime import datetime
from dotenv import load_dotenv
from app.models.database import create_tables

load_dotenv()

app = FastAPI(
    title="AI Document Intelligence API",
    description="Extract structured JSON from financial documents",
    version="0.1.0"
)

@app.on_event("startup")
def startup_event():
    create_tables()

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
    return {"api": "ok", "db": "ok", "llm": "ok"}