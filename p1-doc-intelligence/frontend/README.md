# Document Intelligence — Frontend

Minimal React (Vite) UI for the [AI Document Intelligence API](../README.md): drag-and-drop PDF upload, document type selection, JSON results view, and extraction history.

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
