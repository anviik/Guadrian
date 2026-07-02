"""Wire the four nodes into a StateGraph.

This topology IS the architecture — it is not a placeholder. The conditional edge
off the guardian is what makes oversight structural: the worker's output has no edge
that reaches `execute` without first passing through `guardian`.

    START -> worker
    worker   --(has action?)-->  guardian   |  (none) --> END
    guardian --(verdict)----->  { allow: execute, block: worker,
                                  pause: END,     rollback: rollback }
    execute  -------------->  worker         (continue to the next proposed action)
    rollback -------------->  worker         (resume from the restored known-good state)
"""

from __future__ import annotations

from typing import Optional

from langgraph.graph import END, START, StateGraph

from policy.engine import Policy, load_policy
from sandbox import Sandbox

from .nodes import make_nodes
from .state import AgentState


def _route_after_worker(state: AgentState) -> str:
    # The worker signals completion by proposing None (script exhausted, or the LLM
    # worker deciding the task is done). Everything else goes to the guardian.
    return "guardian" if state.get("proposed_action") is not None else "end"


def build_graph(worker, policy: Optional[Policy] = None, sandbox: Optional[Sandbox] = None, judge=None):
    policy = policy or load_policy()
    sandbox = sandbox or Sandbox(root=policy.sandbox_root)

    worker_node, guardian_node, execute_node, rollback_node = make_nodes(
        worker=worker, policy=policy, sandbox=sandbox, judge=judge
    )

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
        {"allow": "execute", "block": "worker", "pause": END, "rollback": "rollback"},
    )

    graph.add_edge("execute", "worker")    # loop to the next action
    graph.add_edge("rollback", "worker")   # resume from the restored state

    return graph.compile()
