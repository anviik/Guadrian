# frontend/ — live visualization (Next.js + shadcn/ui)

Next.js 16 (App Router, static export) + Tailwind v4 + shadcn/ui, designed as an
editorial spec sheet: Instrument Serif display type, mono data labels, hairline
rules instead of cards, and inked verdict stamps. Two themes via next-themes —
warm paper (light) and deep ink (dark) — with a lilac accent; matcha green is the
ALLOW color, plum is ROLLBACK.

- **Landing page** (`/`) — asymmetric hero + spec column, scrolling verdict
  ticker, numbered mechanism index (01 Intercept / 02 Evaluate / 03 Roll back),
  typographic flow diagram, and the scope-honesty footnote.
- **Console** (`/console/`) — subscribes once to the backend WebSocket and renders
  each event live (no polling):
  - *Agent graph* — schematic SVG (worker → guardian → execute, human + rollback
    branches); edges pulse in the verdict color: matcha ALLOW, red BLOCK, amber
    PAUSE, plum ROLLBACK.
  - *Ledger* — a numbered entry per judged action: tool, verdict stamp (with
    deciding stage: rules / judge / human), reason, execution result.
  - *Approval modal* — raised on PAUSE; Approve resumes with `human_approved`
    (the sandbox rule still outranks it), Deny records the denial.
  - *Sandbox panel* — the sandbox contents; a rollback is visible as the file
    reverting.

## Run it

Dev (hot reload; backend on :8000 via `uvicorn server:app --reload`):

    npm install
    npm run dev          # http://localhost:3000 (talks to the backend cross-origin)

Production one-command demo:

    npm run build        # static export to out/; the backend serves it at
                         # http://127.0.0.1:8000/
