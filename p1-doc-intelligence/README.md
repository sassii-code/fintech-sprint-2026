<div align="center">

<img src="docs/assets/banner.svg" alt="AI Document Intelligence API" width="100%" />

**Extract structured JSON from resumes, bank statements, and invoices — powered by Gemini.**

![Python](https://img.shields.io/badge/python-3.13-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.139-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-SQLAlchemy-336791?logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini_2.5_Flash-4285F4?logo=googlegemini&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)

[**Live Demo**](https://fintech-sprint-2026.onrender.com) · [API Reference](#api-reference) · [Setup](#setup)

</div>

---

## Live Demo

**API:** [fintech-sprint-2026.onrender.com](https://fintech-sprint-2026.onrender.com) · [Swagger UI](https://fintech-sprint-2026.onrender.com/docs)

> Hosted on Render's free tier — the first request after a period of inactivity may take ~30s while the instance spins up.

## Features

- 📄 **Multi-document extraction** — dedicated endpoints for resumes, bank statements, and invoices, plus an `/auto` endpoint that detects document type from content
- 🧩 **Custom field extraction** — `/extract/custom` lets callers specify exactly which fields to pull out of a document, no fixed schema required
- 🖼️ **Multi-format ingestion** — PDF, JPG/PNG (via Tesseract OCR), DOCX, and TXT all go through the same extraction pipeline
- 🤖 **LLM-powered** — Gemini 2.5 Flash turns raw document text into structured JSON against a per-document-type (or custom) schema
- 🔐 **JWT-protected API** — every extraction endpoint requires a bearer token issued via `/auth/token`
- 🗄️ **Persistent history** — every extraction is saved to PostgreSQL and retrievable via `/extract/history`
- 🛡️ **Resilient by design** — empty files, corrupt files, unsupported formats, LLM timeouts, and malformed LLM output all return clean, typed error responses instead of crashing
- 💻 **React frontend** — drag-and-drop (single or batch) upload, template library, JSON/CSV export; see [`frontend/`](frontend/README.md)
- ☁️ **Deploy-ready** — `Procfile` + environment-driven config (`$PORT`, `$DATABASE_URL`) for one-click deploy to Render

## Architecture

```mermaid
flowchart LR
    Client(["Client / React frontend"])

    subgraph API["FastAPI app"]
        Auth["/auth/token\n(JWT issuance)"]
        Extract["/extract/*\n(JWT-protected)"]
        FileToText["file_to_text()\nPDF · image (OCR) · DOCX · TXT"]
    end

    Gemini[("Google Gemini\n2.5 Flash")]
    DB[("PostgreSQL\nextractions table")]

    Client -- "1. client_id/secret" --> Auth
    Auth -- "JWT" --> Client
    Client -- "2. file + doc_type or custom fields" --> Extract
    Extract --> FileToText
    FileToText -- "raw text" --> Extract
    Extract -- "prompt" --> Gemini
    Gemini -- "structured JSON" --> Extract
    Extract -- "persist" --> DB
    Extract -- "3. extracted_data" --> Client
```

> **OCR note:** image extraction (`.jpg`/`.png`) depends on the Tesseract OCR binary being present on the host. It's not installed on the current Render deployment (Render's native Python runtime doesn't include it), so image uploads there will return a `503` until the service is switched to a Docker-based deploy with Tesseract installed. PDF, DOCX, and TXT are unaffected — they're pure-Python.

## Setup

1. **Clone and enter the project**
   ```bash
   cd p1-doc-intelligence
   ```

2. **Create a virtual environment and install dependencies**
   ```bash
   python -m venv venv
   venv\Scripts\activate        # Windows
   source venv/bin/activate     # macOS/Linux
   pip install -r requirements.txt
   ```

3. **Create a `.env` file** in the project root:
   ```
   GEMINI_API_KEY=your-gemini-api-key
   DATABASE_URL=postgresql://user:password@localhost:5432/your_db
   SECRET_KEY=a-long-random-secret-for-signing-jwts
   ```
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)
   - `DATABASE_URL` — a running PostgreSQL instance; the database itself must already exist. `postgres://` URLs (e.g. from Render) are normalized to `postgresql://` automatically.
   - `SECRET_KEY` — if omitted, falls back to an insecure hardcoded dev default — always set this outside local dev

4. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```
   Tables are created automatically on startup.

5. **Explore the API** — interactive Swagger UI is served at `http://localhost:8000/docs`:

   <img src="docs/assets/swagger-ui.png" alt="Swagger UI — full endpoint list" width="100%" />

   Expand any endpoint to try it directly from the browser — request bodies, parameters, and response schemas included:

   <img src="docs/assets/swagger-ui-detail.png" alt="Swagger UI — expanded endpoint detail" width="100%" />

## Authentication

All `/extract/*` endpoints require a bearer token. Get one from `/auth/token` using a registered client:

**Request**
```bash
curl -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id": "client_demo", "client_secret": "demo123"}'
```

**Response**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": "30 days"
}
```

Registered clients are currently hardcoded in `app/routers/auth.py` — replace with a real client store before production use.

Pass the token on every subsequent request:
```
Authorization: Bearer <jwt>
```

## API Reference

### `POST /auth/token`
Exchange `client_id` / `client_secret` for a JWT (30-day expiry). See [Authentication](#authentication) above.

All `/extract/*` endpoints below accept **PDF, JPG, PNG, DOCX, or TXT** — the file extension determines how text is pulled out (PyMuPDF/pdfplumber for PDF, Tesseract OCR for images, python-docx for Word, plain decode for text) before it's handed to Gemini.

### `POST /extract/raw-text`
Extract raw text from a document — no LLM involved.

**Request**
```bash
curl -X POST http://localhost:8000/extract/raw-text \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"
```

**Response**
```json
{
  "filename": "document.pdf",
  "char_count": 1532,
  "preview": "First 2000 characters of extracted text..."
}
```

### `POST /extract/resume`
Extract structured resume data.

**Request**
```bash
curl -X POST http://localhost:8000/extract/resume \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@resume.pdf"
```

**Response**
```json
{
  "id": 5,
  "filename": "resume.pdf",
  "doc_type": "resume",
  "extracted_data": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0100",
    "education": [
      { "institution": "State University", "degree": "B.S. Computer Science", "duration": "2018–2022" }
    ],
    "experience": [
      { "company": "Acme Corp", "position": "Software Engineer", "duration": "2022–Present", "achievements": ["Shipped X", "Improved Y by 30%"] }
    ],
    "skills": ["Python", "SQL", "FastAPI"]
  }
}
```

### `POST /extract/bank-statement`
Extract account holder/number, bank name, transactions, and balances.

**Response shape**
```json
{
  "id": 6,
  "filename": "statement.pdf",
  "doc_type": "bank_statement",
  "extracted_data": {
    "account_holder": "Jane Doe",
    "account_number": "****1234",
    "bank_name": "First National Bank",
    "transactions": [
      { "date": "2026-06-01", "description": "Grocery Store", "debit": 54.20, "credit": null }
    ],
    "opening_balance": 1200.00,
    "closing_balance": 1145.80,
    "total_debits": 54.20,
    "total_credits": 0.00
  }
}
```

### `POST /extract/invoice`
Extract vendor info, line items, and totals.

**Response shape**
```json
{
  "id": 7,
  "filename": "invoice.pdf",
  "doc_type": "invoice",
  "extracted_data": {
    "vendor_name": "Acme Supplies",
    "vendor_address": "123 Market St",
    "invoice_number": "INV-1042",
    "invoice_date": "2026-06-01",
    "due_date": "2026-06-30",
    "line_items": [
      { "description": "Widgets", "quantity": 10, "unit_price": 5.00, "total": 50.00 }
    ],
    "subtotal": 50.00,
    "tax": 4.50,
    "total_amount": 54.50,
    "currency": "USD"
  }
}
```

### `POST /extract/custom`
Extract an arbitrary, caller-specified set of fields instead of a fixed schema — the basis for the frontend's template library.

**Request**
```bash
curl -X POST http://localhost:8000/extract/custom \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@receipt.jpg" \
  -F "fields=merchant_name, date, total, payment_method"
```

**Response**
```json
{
  "id": 8,
  "filename": "receipt.jpg",
  "doc_type": "custom",
  "extracted_data": {
    "merchant_name": "Corner Cafe",
    "date": "2026-07-01",
    "total": 14.50,
    "payment_method": "card"
  }
}
```
`fields` is a comma-separated string; fields not found in the document come back as `null`. Returns `400` if `fields` is empty.

### `POST /extract/auto`
Auto-detects document type (resume / bank statement / invoice / general) from content keywords, then extracts accordingly. Same request/response shape as the endpoints above, with `doc_type` reflecting what was detected.

### `GET /extract/history`
Returns the 20 most recent extractions.

**Response**
```json
[
  { "id": 7, "filename": "invoice.pdf", "doc_type": "invoice", "created_at": "2026-07-07T10:15:00" },
  { "id": 6, "filename": "statement.pdf", "doc_type": "bank_statement", "created_at": "2026-07-07T10:12:00" }
]
```

### `GET /extract/history/{id}`
Returns a single extraction record, including its full `extracted_data`. `404` if not found.

### `GET /health`
Basic liveness check — `{ "api": "ok", "db": "ok", "llm": "ok" }`.

## Error Handling

| Situation | Status |
|---|---|
| Missing/invalid bearer token | `401` |
| No file, empty file, unsupported extension, or empty `fields` on `/extract/custom` | `400` |
| File fails to parse (corrupt/malformed) or has no extractable text | `422` |
| OCR engine (Tesseract) not available on the host | `503` |
| Extraction record not found (`/history/{id}`) | `404` |
| Gemini request times out | `504` |
| Gemini API error, blocked response, or malformed JSON output | `502` |

## Tech Stack

| Layer | Choice |
|---|---|
| API framework | FastAPI + Uvicorn |
| PDF parsing | PyMuPDF (primary), pdfplumber (fallback) |
| Image OCR | Tesseract via `pytesseract` |
| Word doc parsing | `python-docx` |
| LLM extraction | Google Gemini 2.5 Flash |
| Database | PostgreSQL via SQLAlchemy |
| Auth | JWT (`python-jose`) + `passlib` |
| Frontend | React + Vite (see [`frontend/`](frontend/README.md)) |
| Deployment | Render (`Procfile`, env-driven config) |
