# Roadmap (private notes)

The design doc's timeline, reordered slightly to frontload technical/demo risk. We do
the boring-but-critical core first; the UI is a window onto state we'll already have.

## Step 1 — Graph skeleton  ✅ done (merged in PR #1)
Runnable in terminal. Stub nodes. Proves worker-can't-bypass-guardian and the three
verdict paths. **Deliverable:** `python backend/main.py` prints a clean verdict trace.

## Step 2 — Rule engine + YAML policy  ✅ done (merged in PR #1)
Moved the stub guardian `if`s into `policy.yaml` + a real `check_policy_rules()` that
returns `allow` / `block` / `pause` / `ambiguous`. Deterministic, fully unit-testable
(11 tests in `backend/tests/`), no API key needed. Ambiguous fail-safes to `pause`
via `on_ambiguous` until the judge exists. **Deliverable met:** policy changes alter
verdicts with zero code changes.

## Step 3 — Real worker + LLM judge  (doc Days 1–4)  ← next
- Worker: real Claude call with tool definitions; it proposes, never executes.
- Judge: on `ambiguous`, call `claude-sonnet-4-6` with task + action + history; parse
  `ALLOW/BLOCK/PAUSE` + reason. This is where drift detection becomes real.
**Deliverable:** an off-task action gets caught by the judge, not by a hard rule.
**Note:** needs `ANTHROPIC_API_KEY` in `.env`. First time we spend tokens.

## Step 4 — Sandbox snapshot + rollback  (doc Days 3–4)
Real filesystem: `capture_state(target)` copies the file before a write;
`restore_state(snapshot)` undoes it. Wire the `rollback` node so detected drift pops
the stack and restores. **Deliverable:** an executed write is visibly undone on disk.
This is the strongest single demo moment — invest here.

## Step 5 — FastAPI + WebSocket  (doc Days 5–6)
Wrap the graph in FastAPI; stream every LangGraph state transition over a WebSocket.
Frontend subscribes once, renders deltas, never polls. **Deliverable:** state changes
appear live over a socket (test with a CLI ws client before any React).

## Step 6 — React + Vite (TS) frontend  (doc Days 5–6)
Two-node graph, action-log cards, approval modal on PAUSE. Edges color by verdict
(green/red/amber). Rollback visibly reverts the graph. **Deliverable:** the demo video
shot list.

## Step 7 — Polish + submission  (doc Day 7+)
Camera-friendly `policy.yaml`, README *with the explicit scope-honesty section*,
architecture diagram, demo video, final testing.

## Standing reminders
- **Scope honesty in the README.** Rollback is on a sandbox, not arbitrary real-world
  effects. The LLM judge is probabilistic defense-in-depth, not a guarantee. The demo
  policy is intentionally easy to trigger on camera. Stating these is a credibility
  signal.
- **Model IDs:** worker + judge use `claude-sonnet-4-6` (current). Don't downgrade.
- **De-risk order > doc order.** When in doubt, build the thing that would sink the
  demo if it didn't work, first.
