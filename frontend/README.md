# frontend/ — live visualization (Next.js + shadcn/ui)

Next.js 16 (App Router, static export) + Tailwind v4 + shadcn/ui, themed
cyberpunk-clean: neon verdict colors reserved for meaning on an otherwise quiet,
Apple-inspired dark canvas.

- **Landing page** (`/`) — what Guardian is, the three-verdict model, and the
  scope-honesty statement, with a CTA into the console.
- **Console** (`/console/`) — subscribes once to the backend WebSocket and renders
  each event live (no polling):
  - *Agent graph* — SVG layout (worker → guardian → execute, human + rollback
    branches); edges pulse in the verdict color: green ALLOW, red BLOCK, amber
    PAUSE, purple ROLLBACK.
  - *Action log* — a card per judged action: tool, verdict badge (with deciding
    stage: rules / judge / human), reason, execution result.
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
