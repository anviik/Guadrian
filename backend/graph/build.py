"""Wire the four nodes into a StateGraph.

This topology IS the architecture — it is not a placeholder. The conditional edge
off the guardian is what makes oversight structural: the worker's output has no edge
that reaches `execute` without first passing through `guardian`.

  START -> worker
  worker   --(has action?)-->  guardian   |  (none) --> END   [skeleton-only convenience]
  guardian --(verdict)----->  { allow: execute, block: worker, pause: END }
  execute  -------------->  worker         (continue to the next proposed action)
  rollback -------------->  worker         (defined for completeness; unused in Step 1)
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from .nodes import execute_node, guardian_node, rollback_node, worker_node
from .state import AgentState


def _route_after_worker(state: AgentState) -> str:
    # SKELETON-ONLY: the design doc draws worker -> guardian as a plain edge. We add
    # this tiny "any actions left?" check purely so the scripted demo terminates.
    # When the real Claude worker lands (Step 3), the worker itself decides it's done
    # and this conditional is removed.
    return "guardian" if state.get("proposed_action") is not None else "end"


def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("worker", worker_node)
    graph.add_node("guardian", guardian_node)
    graph.add_node("execute", execute_node)
    graph.add_node("rollback", rollback_node)

    graph.add_edge(START, "worker")

    graph.add_conditional_edges(
        "worker",
        _route_after_worker,
        {"guardian": "guardian", "end": END},
    )

    # The core of the whole project: routing is enforced by the graph, not by trust.
    graph.add_conditional_edges(
        "guardian",
        lambda state: state["guardian_verdict"],
        {"allow": "execute", "block": "worker", "pause": END},
    )

    graph.add_edge("execute", "worker")    # loop to the next action
    graph.add_edge("rollback", "worker")   # wired for Step 4; unused in the skeleton

    return graph.compile()
