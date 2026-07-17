# DocSense AI — Frontend

React (Vite) UI for the [AI Document Intelligence API](../README.md), with a dark, glassmorphic "premium SaaS" design system.

## Features

- **Single or batch upload** — drag-and-drop one file, or many at once with a per-file progress list
- **Multi-format** — accepts PDF, JPG, PNG, DOCX, TXT
- **Document type selector** — Auto-detect, Resume, Invoice, Bank Statement, or Custom Fields
- **Custom field extraction** — type any comma-separated field list, or start from a template (Invoice, Resume, Bank Statement, Receipt, Tax Form, Contract)
- **Split-view results** — document info on the left, a resizable, syntax-highlighted, fullscreen-capable JSON viewer on the right (`JsonView`)
- **Copy JSON**, **Download CSV** (instant, client-side), and **Download Excel** (calls the backend's `/extract/export`, formatted `.xlsx`) on every result
- **Batch export** — download all results from a batch run as a single CSV or Excel file
- **History panel** — browse and reload past extractions, with skeleton loading states
- **Live server status** — pings `/health` on load and shows Connecting → Ready in the header, so a cold Render instance starts waking up immediately rather than waiting for your first extraction
- **Toast notifications** for success/error feedback
- Fade/slide-in animations, hover/glow states, and a dot-grid background — see [design notes](#design-system) below

## Setup

```bash
npm install
cp .env.example .env   # then edit VITE_API_BASE_URL if you're not targeting the deployed API
npm run dev
```

No login step — the app loads straight into the upload interface (public demo, no auth wall on the backend).

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `https://fintech-sprint-2026.onrender.com` | Base URL of the FastAPI backend |

## Build

```bash
npm run build
```

Outputs static assets to `dist/`, deployable to any static host (Render Static Site, Vercel, Netlify, etc.). The build:
- Code-splits `ResultsView`, `BatchResults`, and `HistoryPanel` into separate chunks (lazy-loaded, not needed for first paint)
- Splits `react`/`react-dom` and `lucide-react` into their own vendor chunks for better caching
- Emits pre-compressed `.gz`/`.br` variants of every asset (`vite-plugin-compression2`) for hosts that serve them directly

## Design system

Dark navy background (`#0a0e1a`) with a subtle dot-grid pattern and radial gradient glow, indigo/purple (`#6366f1` → `#8b5cf6`) accents, and glassmorphic cards (`backdrop-filter: blur`). Design tokens live in `src/index.css` as CSS variables (`--bg`, `--accent-1`/`--accent-2`, `--glass`, etc.) — change them there to retheme the whole app.

`JsonView` (`src/components/JsonView.jsx`) resizes via the browser's native `resize: both` (drag the bottom-right corner) rather than a hand-rolled drag handler — simpler and more robust than reimplementing multi-edge dragging, at the cost of only the corner being draggable (a browser platform constraint, not a design choice). Its fullscreen mode renders through a `createPortal` directly under `<body>`, which matters because any animated ancestor (e.g. the `.slide-in` results panel) leaves a lingering CSS `transform` after its animation completes — and per spec, a non-`none` transform creates a containing block that traps `position: fixed` descendants inside it instead of the viewport. The portal sidesteps that entirely.
