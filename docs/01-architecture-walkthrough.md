# Architecture Walkthrough (private notes)

Four layers. We build them roughly back-to-front (the risky core first, the pretty
UI last).

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js + shadcn/ui, TS)     ✅ working                │
│  • Live agent graph: worker ●──edge──● guardian                   │
│  • Action log panel: description, verdict, timestamp              │
│  • Human approval modal: appears on a PAUSE verdict               │
└───────────────▲───────────────────────────────────────────────── ┘
                │ WebSocket (state deltas, no polling)
┌───────────────┴─────────────────────────────────────────────────┐
│  BACKEND  (FastAPI)                      ✅ working                │
│  • REST endpoints + WebSocket broadcaster                        │
│  • Hosts the LangGraph runtime and streams each state transition │
└───────────────▲───────────────────────────────────────────────── ┘
                │ runs
┌───────────────┴─────────────────────────────────────────────────┐
│  AGENTS / GRAPH  (LangGraph)             ✅ working                │
│  StateGraph with 4 nodes + 1 conditional edge:                   │
│    worker → guardian →(allow) execute                            │
│                       →(block) worker                            │
│                       →(pause) END                               │
└───────────────▲───────────────────────────────────────────────── ┘
                │ acts on
┌───────────────┴─────────────────────────────────────────────────┐
│  SANDBOX                                 ✅ working                │
│  • Local filesystem (the real target the worker affects)         │
│  • Rollback stack (LIFO of snapshots)                            │
│  • Policy config (YAML — hard deterministic rules)  ✅ Step 2     │
└──────────────────────────────────────────────────────────────────┘
```

## Following one action through the system

This is the whole product in one trace. Memorize this and you understand Guardian.

1. **Task arrives.** e.g. "Clean up the temp files in the sandbox."
2. **Worker proposes an action** — *as data*, not as a call:
   `{"tool": "delete_file", "target": "sandbox/temp/log1.txt"}`.
   It hands this to the graph state and stops. It does **not** delete anything.
3. **Guardian evaluates — Stage 1 (rules).** A YAML policy is checked with plain
   Python. Is the path inside `sandbox/`? Is it under the max-records limit? These
   are instant, deterministic, and auditable. Three outcomes: `allow`, `block`, or
   `ambiguous`.
4. **Guardian evaluates — Stage 2 (LLM judge), only if `ambiguous`.** We send Claude
   (`claude-sonnet-4-6`) the original task, the proposed action, and the history,
   and ask: *does this still serve the task, or has the worker drifted?* It replies
   `ALLOW` / `BLOCK` / `PAUSE` + a one-line reason. This is where drift detection
   lives, because drift is a judgment call, not a fixed rule.
5. **Routing on the verdict** (the conditional edge):
   - **allow →** go to `execute`.
   - **block →** go back to `worker` with the reason; it tries something else.
   - **pause →** stop and wait for a human (in the skeleton, this just ends).
6. **Execute (allow path only).** *Before* running, snapshot the target and push it
   onto the rollback stack. Then run the action. Append to the action log.
7. **Rollback (when drift is detected later).** Pop the most recent snapshot and
   restore it. The system returns to its last known-good state. In the demo, this
   is the single strongest visual moment.

## Why two guardian stages (the part worth defending in an interview)

- A **pure LLM judge** would be slow and nondeterministic even for dumb cases — you
  do not want a model call to decide whether a path is inside a folder.
- A **pure rule engine** can't catch semantic drift — a worker obeying every rule
  but no longer doing the task.
- **Together** they cover both failure modes. The split is itself a real engineering
  decision: cheap-and-certain first, expensive-and-smart only when needed. This
  mirrors how regulated-industry rule engines are actually built.

## The state object (the spine of everything)

One dict is threaded through every node. From the design doc:

```python
class AgentState(TypedDict):
    task: str             # the original goal, never changes
    proposed_action: dict # the worker's latest proposal
    guardian_verdict: str # "allow" | "block" | "pause"
    action_log: list      # running history of what executed
    rollback_stack: list  # LIFO of pre-action snapshots
```

Every node takes this state, returns a partial update, and LangGraph merges it. The
conditional edge reads `guardian_verdict` to decide where to go next. That single
field is the entire control mechanism.

Next: `02-graph-skeleton-explained.md`.
