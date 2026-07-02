import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, GuardianEvent, LogEntry, Pulse, Snapshot } from "./types";

export interface GuardianState {
  connected: boolean;
  status: string;
  mode: string;
  task: string;
  log: LogEntry[];
  stackDepth: number;
  pending: Action | null;
  pendingReason: string;
  sandbox: string;
  pulse: Pulse | null;
  banner: string | null; // one-line notice, e.g. a rollback restore
}

const INITIAL: GuardianState = {
  connected: false,
  status: "idle",
  mode: "",
  task: "",
  log: [],
  stackDepth: 0,
  pending: null,
  pendingReason: "",
  sandbox: "",
  pulse: null,
  banner: null,
};

const VERDICT_EDGE: Record<string, string> = {
  allow: "ge",
  block: "gw",
  pause: "gh",
  rollback: "gr",
};

export function useGuardian() {
  const [state, setState] = useState<GuardianState>(INITIAL);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let retry: number | undefined;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => setState((s) => ({ ...s, connected: true }));
      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        if (!closed) retry = window.setTimeout(connect, 1500);
      };
      ws.onmessage = (msg) => {
        const ev: GuardianEvent = JSON.parse(msg.data);
        setState((s) => reduce(s, ev));
      };
    };

    connect();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      wsRef.current?.close();
    };
  }, []);

  const post = useCallback(async (path: string, body?: object) => {
    await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  }, []);

  return { state, post };
}

function fromSnapshot(s: GuardianState, snap: Snapshot): GuardianState {
  return {
    ...s,
    status: snap.status,
    mode: snap.mode,
    task: snap.task,
    log: snap.action_log,
    stackDepth: snap.stack_depth,
    pending: snap.pending,
    sandbox: snap.sandbox,
  };
}

function reduce(s: GuardianState, ev: GuardianEvent): GuardianState {
  const pulse = (edge: string, verdict: string): Pulse => ({
    edge,
    verdict,
    key: (s.pulse?.key ?? 0) + 1,
  });

  switch (ev.type) {
    case "hello":
      return fromSnapshot(s, ev.state!);

    case "reset":
      return { ...INITIAL, connected: s.connected };

    case "run_started":
      return {
        ...s,
        status: "running",
        task: ev.task ?? "",
        mode: ev.mode ?? "",
        log: [],
        stackDepth: 0,
        pending: null,
        banner: null,
        sandbox: "",
      };

    case "proposal":
      return { ...s, pulse: pulse("wg", "propose") };

    case "verdict": {
      const entry: LogEntry = {
        action: ev.action ?? null,
        verdict: ev.verdict ?? "",
        reason: ev.reason ?? "",
        stage: ev.stage,
      };
      return {
        ...s,
        log: [...s.log, entry],
        pulse: pulse(VERDICT_EDGE[ev.verdict ?? ""] ?? "wg", ev.verdict ?? ""),
      };
    }

    case "executed": {
      const log = [...s.log];
      const last = log[log.length - 1];
      if (last) log[log.length - 1] = { ...last, result: ev.result };
      return { ...s, log, stackDepth: ev.stack_depth ?? s.stackDepth };
    }

    case "rollback":
      return {
        ...s,
        log: [
          ...s.log,
          {
            action: null,
            verdict: "rollback",
            reason: `restored ${ev.restored}`,
            stage: "rollback",
          },
        ],
        stackDepth: ev.stack_depth ?? s.stackDepth,
        pulse: pulse("rw", "rollback"),
        banner: `⟲ rolled back — ${ev.restored} restored to its pre-action state`,
      };

    case "paused":
      return {
        ...s,
        status: "paused",
        pending: ev.action ?? null,
        pendingReason: ev.reason ?? "",
      };

    case "denied":
      return {
        ...s,
        log: [
          ...s.log,
          {
            action: ev.action ?? null,
            verdict: "denied",
            reason: ev.reason ?? "",
            stage: "human",
          },
        ],
        pending: null,
        status: "running",
      };

    case "run_complete":
      return {
        ...s,
        status: "idle",
        pending: null,
        sandbox: ev.sandbox ?? s.sandbox,
        stackDepth: ev.stack_depth ?? s.stackDepth,
      };

    case "error":
      return { ...s, status: "idle", banner: `error: ${ev.message}` };

    default:
      return s;
  }
}
