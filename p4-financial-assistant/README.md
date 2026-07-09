# AI Financial Assistant API

Upload bank transactions (CSV/Excel), auto-categorize them with Gemini, and get spending analytics, anomaly detection, and AI-generated financial advice.

## Stack

- **FastAPI** — API framework
- **PostgreSQL + SQLAlchemy** — accounts + transactions storage
- **Google Gemini** (`gemini-2.5-flash`) — transaction categorization + natural-language insights
- **pandas** — file parsing (CSV/Excel) and analytics aggregation
- **JWT** (`python-jose`) + `passlib` — auth (same pattern as `p1-doc-intelligence`)

## Setup

1. **Install dependencies**
   ```bash
   cd p4-financial-assistant
   python -m venv venv
   venv\Scripts\activate        # Windows
   source venv/bin/activate     # macOS/Linux
   pip install -r requirements.txt
   ```

2. **Create a `.env` file**:
   ```
   GEMINI_API_KEY=your-gemini-api-key
   DATABASE_URL=postgresql://user:password@localhost:5432/your_db
   SECRET_KEY=a-long-random-secret-for-signing-jwts
   ```
   The database must already exist. `postgres://` URLs (e.g. from Render) are normalized to `postgresql://` automatically.

3. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```
   Tables are created automatically on startup. Swagger UI at `http://localhost:8000/docs`.

## Authentication

Same hardcoded-client JWT pattern as `p1-doc-intelligence`. Get a token from `/auth/token`:

```bash
curl -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id": "client_demo", "client_secret": "demo123"}'
```

Pass it on every subsequent request: `Authorization: Bearer <jwt>`. Registered clients live in `app/routers/auth.py` — replace with a real client store before production use.

## API Reference

### `POST /transactions/upload`
Upload a CSV or Excel file of transactions. Required columns (case-insensitive): `date`, `description`, `amount`, `type` (`income` or `expense`). Rows are parsed, categorized in a single batched Gemini call per ≤40 rows (not one call per row), and stored under an account (created if it doesn't exist).

- Body: `multipart/form-data` — `file` (CSV/XLSX), `account_name` (optional, default `"Default Account"`)
- Response: `{ account_id, account_name, uploaded_count, transactions: [...] }`, each transaction including its Gemini-assigned `category` (one of `Food`, `Rent`, `Transport`, `Subscriptions`, `Income`, `Shopping`, `Utilities`, `Entertainment`, `Other`) and extracted `merchant` (or `null`).

### `GET /transactions/accounts`
List the authenticated client's accounts.

### `GET /transactions`
List transactions, most recent first. Query params: `account_id`, `category`, `limit` (default 50, max 500).

### `GET /transactions/{id}`
Single transaction. `404` if not found or not owned by the caller.

### `GET /analytics/spending-by-category`
Total + count of expenses grouped by category, sorted descending.

### `GET /analytics/monthly-trends`
Income, expenses, and net per calendar month.

### `GET /analytics/income-vs-expenses`
All-time totals: `{ total_income, total_expenses, net, savings_rate }`.

### `GET /analytics/top-merchants`
Top merchants by total spend. Query param: `limit` (default 10).

### `GET /analytics/anomalies`
Expense transactions more than 2 standard deviations above the mean expense amount, with `average`, `std_dev`, and `z_score` per flagged transaction.

### `POST /analytics/insights`
Builds a summary (spending by category, monthly trends, income vs expenses, top merchants, anomalies) and sends it to Gemini for natural-language financial advice.

Response: `{ insights: "...", summary: {...} }` — both the generated advice and the raw summary it was based on.

### `GET /health`
Basic liveness check.

## Error Handling

| Situation | Status |
|---|---|
| Missing/invalid bearer token | `401` |
| No file, empty file, unsupported extension (not .csv/.xlsx/.xls), or missing required column | `400` |
| Unparseable file, invalid date/amount/type in a row | `422` |
| Transaction not found / not owned by caller | `404` |
| Gemini request times out | `504` |
| Gemini API error (including rate limits) or malformed categorization output | `502` |

## Data model

- **Account** — `id`, `client_id` (owner, from JWT), `name`, `created_at`
- **Transaction** — `id`, `account_id`, `date`, `description`, `amount`, `type`, `category`, `merchant`, `created_at`

All queries are scoped to the authenticated `client_id` via a join through `Account`, so one client can never see another's data.
