# AI Document Intelligence API

Extracts structured JSON (name, transactions, line items, etc.) from financial PDFs — resumes, bank statements, and invoices — using the Gemini LLM. Endpoints are JWT-protected and extraction history is persisted to PostgreSQL.

**Live demo:** _coming soon_

## Stack

- **FastAPI** — HTTP API
- **PostgreSQL + SQLAlchemy** — extraction history storage
- **Google Gemini** (`gemini-2.5-flash`) — structured data extraction
- **PyMuPDF / pdfplumber** — PDF text extraction (with fallback between the two)
- **JWT** (`python-jose`) + `passlib` — auth

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
   - `DATABASE_URL` — a running PostgreSQL instance; the database itself must already exist
   - `SECRET_KEY` — if omitted, falls back to an insecure hardcoded dev default — always set this outside local dev

4. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```
   Tables are created automatically on startup. API docs (Swagger UI) are available at `http://localhost:8000/docs`.

## Authentication

All `/extract/*` endpoints require a bearer token. Get one from `/auth/token` using a registered client:

```bash
curl -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id": "client_demo", "client_secret": "demo123"}'
```

Response:
```json
{ "access_token": "<jwt>", "token_type": "bearer", "expires_in": "30 days" }
```

Registered clients are currently hardcoded in `app/routers/auth.py` (`client_demo` / `client_tanishka`) — replace with a real client store before production use.

Pass the token on every subsequent request:
```
Authorization: Bearer <jwt>
```

## API Reference

### `POST /auth/token`
Exchange `client_id` / `client_secret` for a JWT (30-day expiry).

### `POST /extract/raw-text`
Extract raw text from a PDF, no LLM involved.
- Body: `multipart/form-data`, field `file` (PDF)
- Response: `{ filename, char_count, preview }`

### `POST /extract/resume`
Extract structured resume data: name, email, phone, education, experience, skills.

### `POST /extract/bank-statement`
Extract account holder/number, bank name, transactions, opening/closing balance, totals.

### `POST /extract/invoice`
Extract vendor info, invoice number/dates, line items, subtotal, tax, total.

### `POST /extract/auto`
Auto-detects document type (resume / bank statement / invoice / general) from content keywords, then extracts accordingly.

All four extraction endpoints above:
- Body: `multipart/form-data`, field `file` (PDF)
- Response: `{ id, filename, doc_type, extracted_data }`
- Persist the result to PostgreSQL

### `GET /extract/history`
Returns the 20 most recent extractions (id, filename, doc_type, created_at).

### `GET /extract/history/{id}`
Returns a single extraction record, including its full `extracted_data`.

### `GET /health`
Basic liveness check — `{ api, db, llm }`.

## Error Handling

| Situation | Status |
|---|---|
| Missing/invalid bearer token | `401` |
| No file, empty file, or non-PDF extension | `400` |
| PDF fails to parse (corrupt/malformed) or has no extractable text | `422` |
| Extraction record not found (`/history/{id}`) | `404` |
| Gemini request times out | `504` |
| Gemini API error, blocked response, or malformed JSON output | `502` |
