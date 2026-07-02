# agents/ — worker + judge implementations (working, Step 3)

- `worker.py` — `ScriptedWorker` (deterministic demo, zero keys) and `LLMWorker`
  (a real model proposing one action at a time as JSON; blocked actions come back
  with the guardian's reason so it re-plans). Workers only ever *propose* — they
  have no execution path.
- `judge.py` — Stage 2 of the guardian, invoked only for `ambiguous` actions:
  `HeuristicJudge` (deterministic drift heuristic for the zero-key demo) and
  `LLMJudge` (the design-doc drift question; unparseable replies fail-safe to
  PAUSE). Both can return the `rollback` verdict.
- `llm.py` — minimal provider adapter: OpenAI (`OPENAI_API_KEY`) or Anthropic
  (`ANTHROPIC_API_KEY`), auto-picked from `.env`.
- `__init__.py` — `build_agents(policy)` selects mock vs LLM agents
  (`GUARDIAN_AGENTS=mock|llm|auto`).
