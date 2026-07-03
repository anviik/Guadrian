export interface Action {
  tool: string;
  target?: string;
  content?: string;
  human_approved?: boolean;
}

export interface LogEntry {
  action: Action | null;
  verdict: string; // allow | block | pause | rollback | denied
  reason: string;
  stage?: string; // rules | judge | human | rollback
  result?: string;
}

/** One event from the backend WebSocket. `type` discriminates the payload. */
export interface GuardianEvent {
  type: string;
  seq?: number;
  task?: string;
  mode?: string;
  action?: Action | null;
  verdict?: string;
  reason?: string;
  stage?: string;
  result?: string;
  restored?: string;
  stack_depth?: number;
  judged?: number;
  executed?: number;
  sandbox?: string;
  message?: string;
  state?: Snapshot;
}

export interface Snapshot {
  status: string; // idle | running | paused
  mode: string;
  task: string;
  action_log: LogEntry[];
  stack_depth: number;
  pending: Action | null;
  sandbox: string;
}

/** Which edge of the graph to pulse, and in what verdict color. */
export interface Pulse {
  edge: string; // "wg" | "ge" | "gw" | "gh" | "gr" | "rw"
  verdict: string; // allow | block | pause | rollback | propose
  key: number; // changes every pulse so the CSS animation retriggers
}

/** In `next dev` the backend runs separately on :8000; in the one-command demo
 *  the backend itself serves the static export, so same-origin works. */
export function backendBase(): string {
  if (typeof location !== "undefined" && location.port === "3000") {
    return `${location.protocol}//${location.hostname}:8000`;
  }
  return "";
}
