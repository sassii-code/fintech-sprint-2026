import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from app.models.database import create_tables

load_dotenv()

app = FastAPI(
    title="AI Financial Assistant API",
    description="Upload transactions, auto-categorize them with Gemini, and get spending analytics + AI insights",
    version="0.1.0"
)

# Frontend (if any) is served separately, so it needs CORS to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    create_tables()

from app.routers import auth
from app.routers import transactions
from app.routers import analytics
from app.routers import insights
from app.routers import export

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(insights.router)
app.include_router(export.router)

ROOT_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Financial Assistant API</title>
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
  <h1>AI Financial Assistant API</h1>
  <p class="tagline">Upload transactions, auto-categorize them with Gemini, and get spending analytics + AI insights.</p>
  <ul>
    <li>📤 Upload CSV/Excel transactions, auto-categorized into 9 spending categories</li>
    <li>📊 Analytics: spending by category, monthly trends, income vs expenses, top merchants</li>
    <li>🤖 AI-generated natural-language financial insights via Gemini</li>
    <li>💬 Ask questions about your own transactions in plain English via <code>/insights/query</code></li>
    <li>🔁 Recurring transaction / subscription detection</li>
    <li>❤️ AI-explained financial health score via <code>/insights/health-score</code></li>
    <li>🚨 Anomaly detection for unusually large transactions</li>
    <li>📑 QuickBooks / Xero accounting export</li>
    <li>🔐 JWT-protected API with token issuance via <code>/auth/token</code></li>
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
