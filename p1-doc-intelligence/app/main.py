import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from app.models.database import create_tables

load_dotenv()

app = FastAPI(
    title="AI Document Intelligence API",
    description="Extract structured JSON from financial documents",
    version="0.1.0"
)

# Frontend is served separately (see frontend/), so it needs CORS to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    create_tables()

from app.routers import extract
from app.routers import auth

app.include_router(extract.router)
app.include_router(auth.router)

ROOT_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Document Intelligence API</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    color: #f8fafc;
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    padding: 24px;
  }
  main {
    max-width: 640px;
    width: 100%;
  }
  h1 {
    font-size: 2rem;
    margin: 0 0 8px;
    background: linear-gradient(90deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  p.tagline {
    color: #94a3b8;
    font-size: 1.05rem;
    margin: 0 0 28px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0 0 32px;
    display: grid;
    gap: 12px;
  }
  li {
    background: rgba(148, 163, 184, 0.08);
    border: 1px solid rgba(148, 163, 184, 0.15);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 0.95rem;
  }
  a.docs-link {
    display: inline-block;
    background: linear-gradient(90deg, #38bdf8, #818cf8);
    color: #0f172a;
    font-weight: 600;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.95rem;
  }
  a.docs-link:hover { opacity: 0.9; }
</style>
</head>
<body>
<main>
  <h1>AI Document Intelligence API</h1>
  <p class="tagline">Extract structured JSON from resumes, bank statements, and invoices using Gemini.</p>
  <ul>
    <li>📄 Dedicated + auto-detecting extraction endpoints for resumes, bank statements, and invoices</li>
    <li>🤖 Gemini-powered structured extraction from raw PDF text</li>
    <li>🔐 JWT-protected API with token issuance via <code>/auth/token</code></li>
    <li>🗄️ Extraction history persisted to PostgreSQL</li>
    <li>🛡️ Graceful handling of bad PDFs, empty files, and LLM timeouts</li>
  </ul>
  <a class="docs-link" href="/docs">Explore the API docs →</a>
</main>
</body>
</html>"""

@app.get("/", response_class=HTMLResponse)
def root():
    return ROOT_PAGE

@app.get("/health")
def health():
    return {"api": "ok", "db": "ok", "llm": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))