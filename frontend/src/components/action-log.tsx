"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERDICT_COLOR: Record<string, string> = {
  allow: "text-allow",
  block: "text-block",
  pause: "text-pause",
  rollback: "text-rollback",
  denied: "text-block",
};

export default function ActionLog(props: { log: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.log.length]);

  return (
    <div className="flex max-h-[600px] flex-col overflow-y-auto border border-border bg-card">
      {props.log.length === 0 && (
        <div className="py-16 text-center font-mono text-xs text-muted-foreground">
          — no entries yet · start a run —
        </div>
      )}
      {props.log.map((e, i) => (
        <Entry key={i} entry={e} n={i + 1} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function Entry({ entry, n }: { entry: LogEntry; n: number }) {
  const color = VERDICT_COLOR[entry.verdict] ?? "text-pause";
  const title = entry.action
    ? `${entry.action.tool}  ${entry.action.target ?? ""}`
    : entry.verdict === "rollback"
      ? "⟲ restore from snapshot"
      : "—";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 border-b border-border px-4 py-3 duration-300 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-3">
          <span className="spec shrink-0">{String(n).padStart(2, "0")}</span>
          <span className="truncate font-mono text-[13px]">{title}</span>
        </span>
        <span className={cn("stamp shrink-0", color)}>
          {entry.verdict.toUpperCase()}
          {entry.stage && entry.stage !== "rules" ? ` · ${entry.stage.toUpperCase()}` : ""}
        </span>
      </div>
      <p className="mt-1.5 pl-8 text-xs leading-relaxed text-muted-foreground">
        {entry.reason}
      </p>
      {entry.result !== undefined && (
        <pre className="ml-8 mt-2 overflow-x-auto border-l-2 border-allow/50 bg-muted/50 px-3 py-2 font-mono text-[11.5px] leading-relaxed">
          {truncate(entry.result, 160)}
        </pre>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
