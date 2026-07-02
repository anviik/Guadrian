"""The state object threaded through every node of the Guardian graph.

This shape is final — it matches the design doc exactly. Every node receives this
state, returns a partial update, and LangGraph merges it. The `guardian_verdict`
field is the entire control mechanism: the conditional edge off the guardian node
reads it to decide where execution goes next.
"""

from __future__ import annotations

from typing import Optional, TypedDict


class AgentState(TypedDict):
    task: str                       # the original goal; never changes
    proposed_action: Optional[dict]  # the worker's latest proposal (None = worker done)
    guardian_verdict: str           # "allow" | "block" | "pause"
    action_log: list                # running history of what executed
    rollback_stack: list            # LIFO of pre-action snapshots
