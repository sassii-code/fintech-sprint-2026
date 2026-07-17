# AI Financial Assistant API

Upload bank transactions (CSV/Excel), auto-categorize them with Gemini, and get spending analytics, anomaly detection, and AI-generated financial advice.

## Stack

- **FastAPI** — API framework
- **PostgreSQL + SQLAlchemy** — accounts + transactions storage
- **Google Gemini** (`gemini-2.5-flash`) — transaction categorization + natural-language insights
- **pandas** — file parsing (CSV/Excel) and analytics aggregation
- **rapidfuzz** — fuzzy merchant/description matching for recurring-transaction detection

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
   ```
   The database must already exist. `postgres://` URLs (e.g. from Render) are normalized to `postgresql://` automatically.

3. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```
   Tables are created automatically on startup, and a shared `demo` account is seeded with ~6 months of realistic transactions on first startup (see `app/seed_data.py`) if none exists yet. Swagger UI at `http://localhost:8000/docs`.

## Authentication

None — this is a public portfolio demo, not a paid service. Every request is treated as the same shared `demo` client (`app/services/auth_service.py`), so there's no login step and no bearer token required. All visitors share the same seeded demo data; uploading a file adds to that shared account rather than creating a private one.

## API Reference

### `POST /transactions/upload`
Upload a CSV, Excel, or PDF file of transactions.

- **CSV/XLSX**: required columns (case-insensitive): `date`, `description`, `amount`, `type` (`income`/`expense`, or `credit`/`debit` as aliases).
- **PDF**: a bank or card statement. The PDF bytes are sent directly to Gemini (native document understanding, not local OCR/text-extraction) with instructions to extract each transaction's date, description, amount, and type — no fixed column layout required.

Either way, rows are parsed/extracted, categorized in a single batched Gemini call per ≤40 rows (not one call per row), and stored under an account (created if it doesn't exist).

- Body: `multipart/form-data` — `file` (CSV/XLSX/PDF), `account_name` (optional, default `"Default Account"`)
- Response: `{ account_id, account_name, uploaded_count, transactions: [...] }`, each transaction including its Gemini-assigned `category` (one of `Food`, `Rent`, `Transport`, `Subscriptions`, `Income`, `Shopping`, `Utilities`, `Entertainment`, `Other`) and extracted `merchant` (or `null`).

### `GET /transactions/accounts`
List the authenticated client's accounts.

### `GET /transactions`
List transactions, most recent first. Query params: `account_id`, `category`, `limit` (default 50, max 500).

### `GET /transactions/{id}`
Single transaction. `404` if not found or not owned by the caller.

### `GET /transactions/recurring`
Detects recurring transactions (subscriptions, rent, paycheck, etc.). Groups transactions by the Gemini-assigned `merchant` (exact match — this is why upload categorization matters here) with a fuzzy-match fallback on raw `description` (rapidfuzz `token_set_ratio` ≥ 80) for rows with no merchant, and amounts within 5% of the cluster's running average. A cluster of 2+ occurrences is "recurring" if the intervals between them are consistently weekly (~7d), monthly (~30d), or yearly (~365d) — see `FREQUENCY_BUCKETS` in `recurring_service.py` for exact tolerances.

Recomputed fresh on every call (so new uploads are picked up immediately) and the results replace this client's rows in the `recurring_transactions` table, so other code can read detected patterns without re-running detection itself.

Response: array of `{ account_id, merchant, amount, type, frequency, occurrence_count, last_seen_date, next_expected_date, total_spent_lifetime, transaction_ids }`.

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

### `POST /insights/query`
Ask a natural-language question about your own transactions (e.g. *"How much did I spend on food last month?"*). The full analytics summary plus your 150 most recent transactions are sent to Gemini with instructions to answer using **only** that data and to say so explicitly — not guess — if it can't answer confidently. If you have zero transactions, this short-circuits with a clear message and skips the Gemini call entirely.

- Body: `{ "question": "..." }`. `400` if empty/whitespace-only.
- Response: `{ question, answer, data_used }` — `data_used` is the exact summary + recent transactions the answer was grounded in, for transparency.

### `GET /insights/health-score`
Financial health score (0-100) from four weighted components — savings rate (35%), month-to-month spending consistency (25%), expense-to-income ratio (25%), and an emergency-fund buffer proxy (15%, since we don't have real bank balances: derived from the average of the running cumulative net (income − expenses) over your transaction history, expressed in months of average expense coverage). `404` if you have no transaction data.

Response: `{ score, breakdown: { savings_rate, consistency, expense_ratio, buffer }, explanation, explanation_updated_at }` — each breakdown entry is `{ value, score }` (raw metric + 0-100 component score); `explanation` is Gemini-generated, citing the actual numbers plus one actionable suggestion.

`score`/`breakdown` are cheap and recomputed on every call. `explanation` is cached per client in the `health_score_cache` table and only regenerated once every 24 hours (Gemini's free tier caps at 20 requests/day, and dashboard loads would burn through that in minutes otherwise) — `explanation_updated_at` tells you when it was last regenerated. If a refresh is due but the Gemini call fails (e.g. rate limited), the endpoint falls back to serving the last cached explanation rather than erroring, as long as one exists at all.

### `GET /health`
Basic liveness check.

### `GET /export/accounting`
Export categorized transactions as a CSV formatted for import into QuickBooks or Xero. Categories are mapped from the Gemini-assigned categories to standard accounting names/codes (see `ACCOUNTING_CATEGORY_MAP` in `export_service.py`, e.g. `Food` → "Meals & Entertainment", `Subscriptions` → "Software & Subscriptions"). Amounts follow accounting-CSV sign convention: expenses negative, income positive.

- Query params: `format` (`quickbooks` or `xero`, required), `date_from`/`date_to` (optional, inclusive `YYYY-MM-DD`)
- QuickBooks columns: `Date, Description, Amount, Category`
- Xero columns: `Date, Amount, Payee, Description, Reference, Account Code`
- `400` for an unsupported format or `date_from` after `date_to`; `404` if no transactions match the filters
- Returns the CSV as a file download (`Content-Disposition: attachment`)

## Error Handling

| Situation | Status |
|---|---|
| No file, empty file, unsupported extension (not .csv/.xlsx/.xls/.pdf), missing required column (CSV/XLSX), empty `question`, unsupported export `format`, or `date_from` after `date_to` | `400` |
| Unparseable file, invalid date/amount/type in a row, or no transactions extractable from a PDF | `422` |
| Transaction not found / not owned by caller; no transaction data for a health score; no transactions matching export filters | `404` |
| Gemini request times out | `504` |
| Gemini API error (including rate limits) or malformed LLM output (categorization, query answer) | `502` |

## Data model

- **Account** — `id`, `client_id` (fixed to `"demo"` — see Authentication above), `name`, `created_at`
- **Transaction** — `id`, `account_id`, `date`, `description`, `amount`, `type`, `category`, `merchant`, `created_at`
- **RecurringTransaction** — `id`, `account_id`, `merchant`, `amount` (average), `type`, `frequency`, `occurrence_count`, `last_seen_date`, `next_expected_date`, `total_spent_lifetime`, `transaction_ids`, `detected_at` — replaced wholesale on each `GET /transactions/recurring` call
- **HealthScoreCache** — `id`, `client_id` (unique), `score`, `breakdown` (JSON), `explanation`, `computed_at` — one row per client, upserted at most once every 24 hours by `GET /insights/health-score`

> **Known data-quality caveat:** `amount` is normalized to a positive magnitude at upload time (`type` is the sole source of direction) as of this table's most recent fix. Rows uploaded *before* that fix may still have signed amounts on `expense` rows, which will skew `/insights/health-score`, `/analytics/*`, and `/export/accounting` for that data until re-uploaded or manually corrected.

All queries are scoped to `client_id` via a join through `Account` — since every request now uses the same shared `"demo"` client_id, all visitors see (and add to) the same dataset.
