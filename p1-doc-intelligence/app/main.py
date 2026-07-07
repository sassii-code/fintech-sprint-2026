import os
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
from app.routers import auth

app.include_router(extract.router)
app.include_router(auth.router)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))