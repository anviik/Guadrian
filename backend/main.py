"""Entry point for the Guardian graph skeleton (Step 1).

Run it:
    python backend/main.py

It builds the LangGraph state machine and runs the scripted demo through it, printing
a verdict trace. Watch for a BLOCK routing back to `worker` and a PAUSE ending the
run — that is the proof that the worker cannot reach `execute` without the guardian.
"""

from __future__ import annotations

from graph.build import build_graph
from graph.state import AgentState


def main() -> None:
    app = build_graph()

    initial: AgentState = {
        "task": "Tidy up the sandbox working directory.",
        "proposed_action": None,
        "guardian_verdict": "",
        "action_log": [],
        "rollback_stack": [],
    }

    print("=" * 70)
    print(f"TASK: {initial['task']}")
    print("=" * 70)

    final = app.invoke(initial)

    print("=" * 70)
    print(f"Executed actions: {len(final['action_log'])}")
    print(f"Rollback stack depth: {len(final['rollback_stack'])}")
    print("Run complete.")
    print("=" * 70)


if __name__ == "__main__":
    main()
