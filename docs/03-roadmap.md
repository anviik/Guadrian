# Roadmap (private notes)

The design doc's timeline, reordered slightly to frontload technical/demo risk. We do
the boring-but-critical core first; the UI is a window onto state we'll already have.

## Step 1 — Graph skeleton  ✅ done (merged in PR #1)
Runnable in terminal. Stub nodes. Proves worker-can't-bypass-guardian and the three
verdict paths. **Deliverable:** `python backend/main.py` prints a clean verdict trace.

## Step 2 — Rule engine + YAML policy  ✅ done (merged in PR #1)
Moved the stub guardian `if`s into `policy.yaml` + a real `check_policy_rules()` that
returns `allow` / `block` / `pause` / `ambiguous`. Deterministic, fully unit-testable,
no API key needed. **Deliverable met:** policy changes alter verdicts with zero code
changes.

## Step 3 — Real worker + LLM judge  ✅ done
`agents/`: `LLMWorker` proposes actions as JSON (blocked actions come back with the
reason, so it re-plans); `LLMJudge` answers the drift question on `ambiguous` and can
return the extra `rollback` verdict. Provider auto-picked from `.env` (OpenAI or
Anthropic — `llm.py` adapter); with no key, `ScriptedWorker` + `HeuristicJudge` run
the same graph deterministically, so the whole demo works with zero keys.
**Deliverable met:** an off-task action (`sync_to_cloud`) is caught by the judge
stage, not by a hard rule.

## Step 4 — Sandbox snapshot + rollback  ✅ done
`sandbox/fs.py`: real filesystem execution under `sandbox/`, `capture_state()` before
every mutating action, `restore_state()` on drift. Mock APIs write records to
`sandbox/outbox/` so even "external" effects are file-backed and reversible.
Containment is enforced independently of the guardian (SandboxViolation).
**Deliverable met:** the demo's append is visibly undone on disk when drift is
detected.

## Step 5 — FastAPI + WebSocket  ✅ done
`server.py` streams every LangGraph transition over `/ws` as typed events; REST for
run/approve/deny/reset. PAUSE holds the action for human review; approve resumes with
`human_approved` (the sandbox rule still outranks it). Verified with a CLI ws client
before any React. **Deliverable met.**

## Step 6 — React + Vite (TS) frontend  ✅ done
Live agent graph with verdict-colored pulsing edges, action-log cards (verdict +
deciding stage + result), approval modal on PAUSE, sandbox panel where rollback is
visible. `npm run build` output is served by the backend at / for a one-command demo.

## Step 7 — Polish + submission  ← remaining
- [ ] Record the demo video (shot list: run → block bounce → rollback revert →
      approval modal → outbox file appears).
- [ ] Screenshots for the submission.
- [ ] Architecture diagram export (the design doc has the source).
- [x] README with the explicit scope-honesty section + local demo instructions.
- [x] Camera-friendly `policy.yaml`.
- [x] Final testing (unit + end-to-end graph tests, WS smoke test).

## Standing reminders
- **Scope honesty in the README.** Rollback is on a sandbox, not arbitrary real-world
  effects. The LLM judge is probabilistic defense-in-depth, not a guarantee. The demo
  policy is intentionally easy to trigger on camera. Stating these is a credibility
  signal.
- **Model IDs:** OpenAI default `gpt-4o-mini` (OPENAI_MODEL to override), Anthropic
  default `claude-sonnet-4-6` (ANTHROPIC_MODEL). Don't downgrade.
- **De-risk order > doc order.** When in doubt, build the thing that would sink the
  demo if it didn't work, first.
