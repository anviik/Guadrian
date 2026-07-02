# The Graph Skeleton, Explained (private notes)

> **Update — Step 2 has landed.** The "few `if` checks in Python" described below
> are gone: the guardian now calls the real rule engine in `backend/policy/`
> (`policy.yaml` + `check_policy_rules()`), which adds a fourth verdict,
> `ambiguous`, that fail-safes to PAUSE until the Step 3 judge exists. The demo
> script changed with it — see the corrected list below. Everything else here
> still describes the code accurately.

This documents *exactly* what we scaffold in step 1. The goal of this step is narrow
and deliberate: **prove the architecture before building anything expensive.** If the
graph routes correctly and the worker provably cannot bypass the guardian, the rest
of the project is just filling in real implementations behind stub functions.

## What is REAL in the skeleton

- The `AgentState` shape (final — matches the design doc).
- The graph topology: 4 nodes + the conditional edge off `guardian`. This is the
  actual architecture, not a placeholder. **This is the thing we are de-risking.**
- The control flow: worker → guardian → (allow/block/pause). You can watch a blocked
  action bounce back and a paused action halt the run.

## What is STUBBED (intentionally, replaced later)

| Piece            | Skeleton version                              | Becomes (later)                          |
|------------------|-----------------------------------------------|------------------------------------------|
| Worker           | Reads from a hard-coded script of actions     | Real Claude API call with tool defs      |
| Guardian rules   | A few `if` checks in Python                    | YAML policy file + `check_policy_rules`  |
| LLM judge        | Not called yet                                 | `claude-sonnet-4-6` ambiguous-case judge |
| Execute          | Prints "would execute"; fake snapshot          | Real filesystem write + real snapshot    |
| Rollback         | Prints "would restore"                          | Real `restore_state` from snapshot       |

Nothing touches a real file in the skeleton. It's pure control-flow proof.

## The scripted worker (why, and the one honest deviation)

A real worker loops: propose → maybe get blocked → propose again. In a skeleton with
no real Claude, an unscripted loop would either run forever or do nothing. So the
skeleton worker reads from a fixed list of demo actions and advances through it. When
the list is empty, the run ends.

**One deviation from the design doc, marked clearly:** the doc draws `worker → guardian`
as a plain edge. The skeleton adds a tiny conditional after the worker — "any actions
left? no → END" — purely so the demo terminates. When the real Claude worker lands,
this is replaced by the worker deciding it's finished. I've commented this in the code
so it's obvious it's scaffolding.

## The demo script we'll run

The skeleton ships with a handful of proposed actions chosen to exercise the verdict
paths on camera-friendly logic (as of Step 2, evaluated by the real rule engine):

1. `write_file` inside `sandbox/` → **allow** (recognized write tool, path in
   sandbox) → execute (fake), snapshot pushed.
2. `read_file` inside `sandbox/` → **allow** (read-only safe tool).
3. `delete_file` targeting `sandbox/../etc/hosts` → **block** (normpath catches the
   sandbox escape) → bounces back to worker.
4. `sync_to_cloud` → matches no hard rule → **ambiguous** → fail-safe **pause** →
   run halts for a human. In Step 3 this exact case routes to the LLM judge instead.

These verdicts come from `check_policy_rules()` in `backend/policy/engine.py`,
driven entirely by `policy.yaml` — change the YAML and the verdicts change with
zero code edits.

## How to read the output

Running `python backend/main.py` prints a trace like:

```
[worker  ] proposes: write_file sandbox/notes/a.txt
[guardian] verdict: ALLOW ('write_file' writes inside the sandbox) -> execute
[execute ] snapshot pushed (stack depth 1); would write sandbox/notes/a.txt
[worker  ] proposes: delete_file sandbox/../etc/hosts
[guardian] verdict: BLOCK (path 'sandbox/../etc/hosts' is outside the sandbox) -> back to worker
[worker  ] proposes: sync_to_cloud sandbox/notes/
[guardian] verdict: PAUSE ('sync_to_cloud' matches no hard rule; no judge yet -> fail-safe PAUSE) -> waiting for human, run ends
```

When you see a BLOCK route back to `worker` and a PAUSE stop the run, the core thesis
is proven: **the worker's output cannot reach `execute` without the guardian's
consent.** That's the win for step 1.

## Files this step creates

```
backend/
  graph/
    state.py     # AgentState TypedDict (final)
    nodes.py     # worker / guardian / execute / rollback stub nodes
    build.py     # StateGraph wiring + conditional edge
  main.py        # entry point: builds graph, runs the demo script, prints trace
  requirements.txt
agents/   sandbox/   policy/   frontend/   # created as empty placeholders w/ READMEs
.env.example       # ANTHROPIC_API_KEY (not needed until the real worker lands)
```

Next: `03-roadmap.md`.
