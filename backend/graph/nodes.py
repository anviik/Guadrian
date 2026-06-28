"""Stub node implementations for the Guardian graph skeleton.

STEP 1 SCOPE: these nodes prove the control flow only. Nothing here touches a real
file or calls a real model. Each stub is replaced by a real implementation in a
later step (see docs/03-roadmap.md):

  worker_node   -> real Claude API call with tool definitions          (Step 3)
  guardian_node -> YAML policy rules + claude-sonnet-4-6 LLM judge      (Steps 2-3)
  execute_node  -> real filesystem write + real snapshot capture        (Step 4)
  rollback_node -> real restore_state() from a popped snapshot           (Step 4)

The point of Step 1 is to make the architecture observable: watch a BLOCK bounce
back to the worker and a PAUSE halt the run, and you've proven the worker cannot
reach `execute` without the guardian's consent.
"""

from __future__ import annotations

from collections import deque

from .state import AgentState

SANDBOX_ROOT = "sandbox/"
MAX_RECORDS = 50  # mirror of a future policy.yaml hard limit


# ---------------------------------------------------------------------------
# Scripted demo actions.
#
# A real worker loops (propose -> maybe blocked -> propose again) driven by Claude.
# With no model in the skeleton, we feed a fixed script so the run is deterministic
# and terminates. This whole block disappears when the real worker lands in Step 3.
# The script is chosen to exercise all three verdict paths on camera-friendly logic.
# ---------------------------------------------------------------------------
_DEMO_SCRIPT = deque([
    {"tool": "write_file",  "target": "sandbox/notes/a.txt", "content": "hello"},
    {"tool": "write_file",  "target": "sandbox/notes/b.txt", "content": "world"},
    {"tool": "delete_file", "target": "/etc/hosts"},          # outside sandbox -> block
    {"tool": "delete_all",  "target": "sandbox/"},            # destructive    -> pause
])


def _log(node: str, msg: str) -> None:
    print(f"[{node:<8}] {msg}")


def worker_node(state: AgentState) -> dict:
    """Propose the next action as DATA. The worker never executes anything itself.

    Skeleton behavior: pop the next scripted action. When the script is empty, set
    proposed_action to None, which the post-worker conditional routes to END.
    """
    if _DEMO_SCRIPT:
        action = _DEMO_SCRIPT.popleft()
        _log("worker", f"proposes: {action['tool']} {action['target']}")
        return {"proposed_action": action}

    _log("worker", "no actions left -> finishing")
    return {"proposed_action": None}


def guardian_node(state: AgentState) -> dict:
    """Evaluate the proposed action and return a verdict.

    Skeleton: a few hard `if`s standing in for the future two-stage guardian. In
    Step 2 the path/limit checks move into policy.yaml; in Step 3 an `ambiguous`
    result escalates to the claude-sonnet-4-6 judge. For now there is no ambiguous
    path — every action resolves to allow/block/pause deterministically.
    """
    action = state["proposed_action"] or {}
    target = action.get("target", "")
    tool = action.get("tool", "")
    n_records = action.get("records", 0)

    if tool == "delete_all" or n_records > MAX_RECORDS:
        verdict, reason = "pause", "destructive / over record limit"
    elif not target.startswith(SANDBOX_ROOT):
        verdict, reason = "block", "path outside sandbox"
    else:
        verdict, reason = "allow", "path inside sandbox"

    arrow = {"allow": "-> execute", "block": "-> back to worker", "pause": "-> waiting for human, run ends"}
    _log("guardian", f"verdict: {verdict.upper():<5} ({reason}) {arrow[verdict]}")
    return {"guardian_verdict": verdict}


def execute_node(state: AgentState) -> dict:
    """Snapshot BEFORE running, then run. Reached only on the `allow` path.

    Skeleton: the snapshot and the write are faked (prints only). Step 4 replaces
    these with capture_state()/run_action() against the real sandbox filesystem.
    """
    action = state["proposed_action"]
    snapshot = {"target": action["target"], "note": "FAKE snapshot (Step 4 makes this real)"}

    rollback_stack = state["rollback_stack"] + [snapshot]
    action_log = state["action_log"] + [{"action": action, "result": "FAKE write"}]

    _log("execute", f"snapshot pushed (stack depth {len(rollback_stack)}); "
                    f"would write {action['target']}")
    return {"rollback_stack": rollback_stack, "action_log": action_log}


def rollback_node(state: AgentState) -> dict:
    """Pop the most recent snapshot and restore it.

    Not triggered by the Step 1 demo script (no drift detection yet), but wired into
    the graph so the architecture is complete. Step 4 adds the real restore + the
    edge that routes detected drift here.
    """
    if not state["rollback_stack"]:
        _log("rollback", "nothing to roll back")
        return {}
    snapshot = state["rollback_stack"][-1]
    _log("rollback", f"would restore {snapshot['target']} (FAKE; Step 4 makes this real)")
    return {"rollback_stack": state["rollback_stack"][:-1]}
