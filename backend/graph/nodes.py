"""Node implementations for the Guardian graph.

Dependencies (worker, judge, policy, sandbox) are injected via `make_nodes` rather
than imported at module level, so the same graph wiring runs with a scripted worker
and heuristic judge (zero API keys) or real LLM-backed agents — and tests can inject
stubs for any piece.

Division of labor:
    worker    proposes the next action as DATA; it has no way to execute anything.
    guardian  Stage 1 deterministic rules, then Stage 2 judge only for `ambiguous`.
    execute   snapshots the effect target BEFORE running, then runs it for real.
    rollback  pops the newest snapshot and restores it (triggered by drift verdicts).
"""

from __future__ import annotations

from policy.engine import Policy, check_policy_rules

from .state import AgentState


def _log(node: str, msg: str) -> None:
    print(f"[{node:<8}] {msg}")


def make_nodes(worker, policy: Policy, sandbox, judge=None):
    """Build the four node functions around the injected dependencies.

    `worker` needs `.propose(state) -> Optional[dict]`; `judge` (optional) needs
    `.evaluate(task, action, action_log) -> (verdict, reason)` and may return the
    extra verdict "rollback" when it detects drift. With no judge, ambiguous actions
    take the policy's fail-safe verdict — nothing unclassified slips through.
    """

    def worker_node(state: AgentState) -> dict:
        # A human-approved action resuming after a PAUSE re-enters here unchanged.
        if state.get("resume_action"):
            action = state["resume_action"]
            _log("worker", f"resuming human-approved action: {action['tool']}")
            return {"proposed_action": action, "resume_action": None}

        action = worker.propose(state)
        if action is None:
            _log("worker", "no further actions -> finishing")
            return {"proposed_action": None}
        _log("worker", f"proposes: {action['tool']} {action.get('target', '')}")
        return {"proposed_action": action}

    def guardian_node(state: AgentState) -> dict:
        action = state["proposed_action"] or {}
        verdict, reason = check_policy_rules(action, policy)
        stage = "rules"

        if verdict == "ambiguous":
            if judge is not None:
                verdict, reason = judge.evaluate(state["task"], action, state["action_log"])
                stage = "judge"
            else:
                fallback = policy.on_ambiguous
                reason = f"{reason}; no judge configured -> fail-safe {fallback.upper()}"
                verdict = fallback

        arrow = {
            "allow": "-> execute",
            "block": "-> back to worker",
            "pause": "-> waiting for human",
            "rollback": "-> DRIFT: rolling back last action",
        }
        _log("guardian", f"verdict: {verdict.upper():<8} [{stage}] ({reason}) {arrow[verdict]}")

        entry = {"action": action, "verdict": verdict, "reason": reason, "stage": stage}
        return {
            "guardian_verdict": verdict,
            "guardian_reason": reason,
            "action_log": state["action_log"] + [entry],
        }

    def execute_node(state: AgentState) -> dict:
        action = state["proposed_action"]
        effect = sandbox.effect_target(action)

        rollback_stack = state["rollback_stack"]
        if sandbox.is_mutating(action["tool"]):
            snapshot = sandbox.capture_state(effect)
            rollback_stack = rollback_stack + [snapshot]
            _log("execute", f"snapshot of {effect} pushed (stack depth {len(rollback_stack)})")

        result = sandbox.run_action(action, effect)
        _log("execute", f"ran {action['tool']}: {result if len(result) < 80 else result[:77] + '...'}")

        # Fill the result into the guardian's log entry for this action.
        updated = {**state["action_log"][-1], "result": result}
        return {
            "rollback_stack": rollback_stack,
            "action_log": state["action_log"][:-1] + [updated],
        }

    def rollback_node(state: AgentState) -> dict:
        if not state["rollback_stack"]:
            _log("rollback", "nothing to roll back")
            return {"last_restored": None}

        snapshot = state["rollback_stack"][-1]
        sandbox.restore_state(snapshot)
        _log("rollback", f"restored {snapshot['target']} to its pre-action state")

        entry = {
            "action": None,
            "verdict": "rollback",
            "reason": f"restored {snapshot['target']} ({state['guardian_reason']})",
            "stage": "rollback",
        }
        return {
            "rollback_stack": state["rollback_stack"][:-1],
            "action_log": state["action_log"] + [entry],
            "last_restored": snapshot["target"],
        }

    return worker_node, guardian_node, execute_node, rollback_node
