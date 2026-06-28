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
a probabilistic LLM judge) is layered defense-in-depth, not a formal guarantee.

## Status

**Step 1 of 7 — graph skeleton.** The LangGraph state machine runs end-to-end in the
terminal with stub nodes, proving the control flow (allow / block / pause routing).
Real worker, LLM judge, policy engine, filesystem rollback, and the React UI follow.
See `docs/` for the full walkthrough and roadmap.

## Run the skeleton

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Layout

```
backend/
  graph/     # AgentState + nodes + StateGraph wiring   (Step 1, working)
  agents/    # real worker + guardian                    (Step 3)
  sandbox/   # filesystem target + rollback stack        (Step 4)
  policy/    # policy.yaml hard rules                     (Step 2)
  main.py    # terminal entry point for the skeleton
frontend/    # React + Vite + TS live visualization      (Step 6)
docs/        # private walkthrough notes + roadmap
```

## Stack

LangGraph · Claude API (`claude-sonnet-4-6`) · FastAPI · WebSockets · React + Vite (TS) · YAML
