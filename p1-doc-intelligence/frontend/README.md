# Document Intelligence — Frontend

Minimal React (Vite) UI for the [AI Document Intelligence API](../README.md).

## Features

- **Single or batch upload** — drag-and-drop one file, or many at once with a per-file progress list
- **Multi-format** — accepts PDF, JPG, PNG, DOCX, TXT
- **Document type selector** — Auto-detect, Resume, Invoice, Bank Statement, or Custom Fields
- **Custom field extraction** — type any comma-separated field list, or start from a template (Invoice, Resume, Bank Statement, Receipt, Tax Form, Contract)
- **Results view** — pretty-printed JSON with **Copy JSON** and **Download CSV** buttons
- **Batch export** — download all results from a batch run as a single CSV
- **History panel** — browse and reload past extractions

## Setup

```bash
npm install
cp .env.example .env   # then edit VITE_API_BASE_URL if you're not targeting the deployed API
npm run dev
```

Sign in with a client ID/secret registered in the API's `app/routers/auth.py` (e.g. `client_demo` / `demo123` in dev).

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `https://fintech-sprint-2026.onrender.com` | Base URL of the FastAPI backend |

## Build

```bash
npm run build
```

Outputs static assets to `dist/`, deployable to any static host (Render Static Site, Vercel, Netlify, etc.).
