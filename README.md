# Guardian

A live oversight layer for autonomous AI agents.

A **worker** agent proposes actions but has no direct path to its environment. A
**guardian** agent evaluates every proposed action *before* it executes — against a
configurable policy — and can **allow**, **block**, or **pause** it for human review.
Every allowed action is snapshotted before it runs, so the system can **roll back** to
a known-good state if the guardian later detects drift.

Oversight here is **architectural, not advisory**: the worker's output cannot reach
execution without passing through the guardian node of a LangGraph state machine.

## Scope (stated honestly)

Guardian operates on a **sandbox** — a local filesystem and mock APIs — where every
action is genuinely reversible. It does **not** claim to reverse irreversible
real-world effects (a sent email, a real financial transaction); true rollback of
those is a much harder, open problem. The two-stage guardian (deterministic rules +
a probabilistic LLM judge) is layered defense-in-depth, not a formal guarantee. The
demo policy is intentionally small and easy to trigger on camera; a production
policy set would be far larger and need its own testing process.

## Status

**All layers working (Steps 1–6).** The full flow runs locally with **zero API
keys**: a scripted worker and deterministic drift heuristic exercise every verdict
path — real sandboxed writes, a blocked sandbox escape, a drift-triggered rollback
that visibly reverts a file on disk, and a PAUSE that waits for human approval in
the UI. Add an OpenAI or Anthropic key to `.env` and the worker + judge become real
models — same graph, same policy, no code changes.

## Demo it locally

```bash
# 1. Backend (from repo root)
cd backend
python3 -m venv ../.venv && source ../.venv/bin/activate
pip install -r requirements.txt

# 2. Frontend (one-time build; served by the backend)
cd ../frontend && npm install && npm run build

# 3. Run
cd ../backend && uvicorn server:app --port 8000
# open http://127.0.0.1:8000 — press ▶ Run, approve/deny the email when it pauses
```

Terminal-only demo (no frontend needed): `python main.py` from `backend/` prints
the full verdict trace and the sandbox contents, including the on-disk rollback.

Frontend development with hot reload: `npm run dev` in `frontend/` (proxies to the
backend on :8000).

### Using a real LLM

```bash
cp .env.example .env   # add OPENAI_API_KEY (or ANTHROPIC_API_KEY)
```

With a key present the worker proposes actions from your typed task and the judge
does real drift detection on ambiguous actions. `GUARDIAN_AGENTS=mock` forces the
scripted demo back on. Everything still executes only through the guardian.

## Tests

```bash
cd backend && python -m pytest tests/   # policy rules, sandbox rollback, graph flow
```

## Layout

```
backend/
  graph/     # AgentState + node factories + StateGraph wiring
  agents/    # ScriptedWorker/LLMWorker + HeuristicJudge/LLMJudge + provider adapter
  sandbox/   # real filesystem target, snapshot/restore, mock API outbox
  policy/    # policy.yaml + deterministic rule engine (Stage 1)
  tests/     # policy, sandbox, and end-to-end graph tests
  main.py    # terminal demo entry point
  server.py  # FastAPI + WebSocket streaming server (serves frontend/dist)
frontend/    # React + Vite + TS live graph, action log, approval modal
docs/        # private walkthrough notes + roadmap
sandbox/     # (created at runtime, gitignored) the worker's target environment
```

## Stack

LangGraph · OpenAI or Claude API (auto-detected from `.env`) · FastAPI · WebSockets · React + Vite (TS) · YAML
