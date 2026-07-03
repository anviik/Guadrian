# frontend/ — live visualization (working, Step 6)

React + Vite + TypeScript. Subscribes once to the backend WebSocket (`/ws`) and
renders each incoming event — no polling, no replay; what you see is the actual
LangGraph run.

- **Agent graph** — fixed layout (worker → guardian → execute, with human and
  rollback branches). Edges pulse in the verdict color as actions flow: green
  ALLOW, red BLOCK, amber PAUSE, purple ROLLBACK.
- **Action log** — one card per judged action: tool, verdict badge (with the
  stage that decided it: rules / judge / human), reason, and execution result.
- **Approval modal** — raised on PAUSE; Approve executes the held action with
  `human_approved` (which the sandbox rule still outranks), Deny records the
  denial and the run continues.
- **Sandbox panel** — the sandbox contents after the run; a rollback is visible
  here as the file reverting.

## Run it

Dev (hot reload; backend on :8000 via `uvicorn server:app --reload`):

    npm install
    npm run dev          # http://localhost:5173

Production one-command demo:

    npm run build        # backend then serves dist/ at http://127.0.0.1:8000/
