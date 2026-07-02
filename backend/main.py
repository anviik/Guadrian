"""Terminal entry point for a full local Guardian run.

Run it (no API keys needed — scripted worker + heuristic judge):

    cd backend && python main.py

The demo exercises every verdict path against the REAL sandbox filesystem: watch
for the BLOCK bouncing back to the worker, the drift-triggered ROLLBACK visibly
reverting sandbox/notes/plan.txt on disk, and the PAUSE ending the run pending a
human. With an API key in .env, the worker and judge become real models — see
agents/llm.py and the README.
"""

from __future__ import annotations

from agents import build_agents
from graph.build import build_graph
from graph.state import initial_state
from policy.engine import load_policy
from sandbox import Sandbox


def main() -> None:
    policy = load_policy()
    sandbox = Sandbox(root=policy.sandbox_root)
    worker, judge, mode = build_agents(policy)

    app = build_graph(worker=worker, policy=policy, sandbox=sandbox, judge=judge)
    state = initial_state("Tidy up the sandbox notes directory.")

    print("=" * 70)
    print(f"TASK: {state['task']}   (agents: {mode})")
    print("=" * 70)

    final = app.invoke(state)

    print("=" * 70)
    executed = sum(1 for e in final["action_log"] if "result" in e)
    print(f"Actions judged: {len(final['action_log'])}  |  executed: {executed}  |  "
          f"rollback stack depth: {len(final['rollback_stack'])}")
    if final["last_restored"]:
        print(f"Rolled back: {final['last_restored']} (restored on disk)")
    print("\nSandbox contents after the run:")
    print(sandbox.tree())
    print("=" * 70)


if __name__ == "__main__":
    main()
