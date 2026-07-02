import { useEffect, useRef } from "react";
import type { LogEntry } from "../types";

export default function ActionLog(props: { log: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.log.length]);

  return (
    <div className="action-log">
      {props.log.length === 0 && (
        <div className="log-empty">No actions yet — start a run.</div>
      )}
      {props.log.map((e, i) => (
        <Card key={i} entry={e} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function Card({ entry }: { entry: LogEntry }) {
  const v = entry.verdict;
  const title = entry.action
    ? `${entry.action.tool}  ${entry.action.target ?? ""}`
    : v === "rollback"
      ? "⟲ rollback"
      : "—";
  return (
    <div className={`card v-${v}`}>
      <div className="card-head">
        <span className="card-title">{title}</span>
        <span className={`badge v-${v}`}>
          {v.toUpperCase()}
          {entry.stage && entry.stage !== "rules" ? ` · ${entry.stage}` : ""}
        </span>
      </div>
      <div className="card-reason">{entry.reason}</div>
      {entry.result !== undefined && (
        <div className="card-result">{truncate(entry.result, 160)}</div>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
