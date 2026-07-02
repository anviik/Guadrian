"""The state object threaded through every node of the Guardian graph.

Every node receives this state, returns a partial update, and LangGraph merges it.
The `guardian_verdict` field is the entire control mechanism: the conditional edge
off the guardian node reads it to decide where execution goes next.

`action_log` is a full audit trail, not just executed actions: the guardian appends
an entry for every proposal it judges (action, verdict, reason, stage), execute
fills in the result, and rollback appends a restore entry. The LLM judge and the
frontend both consume this log.
"""

from __future__ import annotations

from typing import Optional, TypedDict


class AgentState(TypedDict):
    task: str                        # the original goal; never changes
    proposed_action: Optional[dict]  # the worker's latest proposal (None = worker done)
    guardian_verdict: str            # "allow" | "block" | "pause" | "rollback"
    guardian_reason: str             # one-line reason attached to the verdict
    action_log: list                 # audit trail: every proposal, verdict, result
    rollback_stack: list             # LIFO of pre-action snapshots
    last_restored: Optional[str]     # target restored by the most recent rollback
    resume_action: Optional[dict]    # set by the server to resume a human-approved PAUSE


def initial_state(task: str) -> AgentState:
    return {
        "task": task,
        "proposed_action": None,
        "guardian_verdict": "",
        "guardian_reason": "",
        "action_log": [],
        "rollback_stack": [],
        "last_restored": None,
        "resume_action": None,
    }
