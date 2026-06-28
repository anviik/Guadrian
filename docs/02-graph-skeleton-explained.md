# The Graph Skeleton, Explained (private notes)

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

The skeleton ships with a handful of proposed actions chosen to exercise all three
verdict paths on camera-friendly logic:

1. `write_file` inside `sandbox/` → **allow** → execute (fake), snapshot pushed.
2. `write_file` inside `sandbox/` → **allow** → execute (fake).
3. `delete_file` *outside* `sandbox/` → **block** → bounces back to worker.
4. `delete_all` (a deliberately scary action) → **pause** → run halts for a human.

The stub guardian logic that produces those verdicts:

- target path not under `sandbox/` → `block`
- tool == `delete_all` (or affects > N records) → `pause`
- otherwise → `allow`

This is a miniature preview of the real two-stage guardian: the path/limit checks are
exactly the kind of hard rule that will move into `policy.yaml`.

## How to read the output

Running `python backend/main.py` prints a trace like:

```
[worker]   proposes: write_file sandbox/notes/a.txt
[guardian] verdict: ALLOW  (path inside sandbox)
[execute]  snapshot pushed (stack depth 1); would write sandbox/notes/a.txt
[worker]   proposes: delete_file /etc/hosts
[guardian] verdict: BLOCK  (path outside sandbox) -> back to worker
[worker]   proposes: delete_all
[guardian] verdict: PAUSE  (destructive) -> waiting for human, run ends
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
