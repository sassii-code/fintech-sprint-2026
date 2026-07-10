"# Fintech Sprint 2026" 
# Fintech Sprint 2026 🚀

60-day sprint building production-grade fintech + AI/ML projects.

## Projects

### 🔴 P1 — AI Document Intelligence API (In Progress)
Extract structured JSON from financial PDFs using AI.
- Stack: FastAPI · Groq LLM · PostgreSQL · PyMuPDF
- Endpoints: /extract/resume · /extract/bank-statement · 
  /extract/invoice · /extract/auto
- Status: Core extraction working ✅ | Auth + DB in progress

### 🟡 P2 — Smart Expense Tracker API (Week 4)
REST API for expense tracking with ML categorization.

### 🟢 P3 — AI Financial Assistant (Week 7)
RAG-powered chatbot for financial document Q&A.

### 🟣 P4 — AI Financial Assistant API
Upload transaction CSV/Excel files, auto-categorize with Gemini, and get spending analytics, recurring-subscription detection, a financial health score, natural-language Q&A, and QuickBooks/Xero export.
- Stack: FastAPI · Gemini · PostgreSQL · pandas · rapidfuzz · JWT
- Endpoints: /transactions/upload · /transactions/recurring ·
  /analytics/spending-by-category · /analytics/monthly-trends ·
  /analytics/income-vs-expenses · /analytics/top-merchants ·
  /analytics/anomalies · /analytics/insights · /insights/query ·
  /insights/health-score · /export/accounting
- See [`p4-financial-assistant/README.md`](p4-financial-assistant/README.md)

## Stack
Python · FastAPI · PostgreSQL · Redis · Docker · 
Groq LLM · PyMuPDF · SQLAlchemy · JWT

## Sprint Progress
- [x] Environment setup
- [x] PDF text extraction
- [x] AI-powered structured extraction
- [x] Multiple document type endpoints
- [ ] PostgreSQL storage
- [ ] JWT Authentication
- [ ] Deployment
