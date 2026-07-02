import { useState } from "react";
import ActionLog from "./components/ActionLog";
import ApprovalModal from "./components/ApprovalModal";
import GraphView from "./components/GraphView";
import { useGuardian } from "./useGuardian";

const DEFAULT_TASK = "Tidy up the sandbox notes directory.";

export default function App() {
  const { state, post } = useGuardian();
  const [task, setTask] = useState(DEFAULT_TASK);

  const running = state.status === "running";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◉</span> GUARDIAN
          <span className="brand-sub">live oversight for autonomous agents</span>
        </div>
        <div className="controls">
          <span className={`status status-${state.status}`}>
            {state.connected ? state.status : "disconnected"}
          </span>
          <input
            className="task-input"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={running}
            placeholder="task for the worker agent…"
          />
          <button className="btn btn-run" disabled={running || !state.connected}
            onClick={() => post("run", { task })}>
            ▶ Run
          </button>
          <button className="btn" disabled={running || !state.connected}
            onClick={() => post("reset")}>
            Reset
          </button>
        </div>
      </header>

      {state.mode && <div className="mode-line">agents: {state.mode}</div>}
      {state.banner && <div className="banner">{state.banner}</div>}

      <main className="layout">
        <section className="panel panel-graph">
          <h3>Agent graph</h3>
          <GraphView pulse={state.pulse} status={state.status} stackDepth={state.stackDepth} />
          <h3>Sandbox contents</h3>
          <pre className="sandbox-tree">{state.sandbox || "  (empty)"}</pre>
        </section>

        <section className="panel panel-log">
          <h3>Action log {state.task && <span className="task-label">— {state.task}</span>}</h3>
          <ActionLog log={state.log} />
        </section>
      </main>

      {state.status === "paused" && state.pending && (
        <ApprovalModal
          action={state.pending}
          reason={state.pendingReason}
          onApprove={() => post("approve")}
          onDeny={(reason) => post("deny", { reason })}
        />
      )}

      <footer className="scope-note">
        Scope honesty: rollback is demonstrated on a sandboxed filesystem + mock APIs,
        where every action is genuinely reversible. The LLM judge is probabilistic
        defense-in-depth alongside the deterministic rule layer, not a guarantee.
      </footer>
    </div>
  );
}
