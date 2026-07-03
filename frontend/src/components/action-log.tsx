"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import type { LogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERDICT_STYLE: Record<string, { border: string; badge: string }> = {
  allow: { border: "border-l-allow", badge: "bg-allow/10 text-allow" },
  block: { border: "border-l-block", badge: "bg-block/10 text-block" },
  pause: { border: "border-l-pause", badge: "bg-pause/10 text-pause" },
  rollback: { border: "border-l-rollback", badge: "bg-rollback/10 text-rollback" },
  denied: { border: "border-l-block", badge: "bg-block/10 text-block" },
};

export default function ActionLog(props: { log: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.log.length]);

  return (
    <div className="flex max-h-[560px] flex-col gap-2.5 overflow-y-auto pr-1">
      {props.log.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No actions yet — start a run.
        </div>
      )}
      {props.log.map((e, i) => (
        <Entry key={i} entry={e} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function Entry({ entry }: { entry: LogEntry }) {
  const style = VERDICT_STYLE[entry.verdict] ?? VERDICT_STYLE.pause;
  const title = entry.action
    ? `${entry.action.tool}  ${entry.action.target ?? ""}`
    : entry.verdict === "rollback"
      ? "⟲ rollback"
      : "—";

  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-border/60 border-l-4 bg-card/70 px-4 py-3 duration-300",
        style.border,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[13px]">{title}</span>
        <Badge className={cn("shrink-0 rounded-full font-mono text-[10px] tracking-wider", style.badge)}>
          {entry.verdict.toUpperCase()}
          {entry.stage && entry.stage !== "rules" ? ` · ${entry.stage}` : ""}
        </Badge>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.reason}</p>
      {entry.result !== undefined && (
        <pre className="mt-2 overflow-x-auto rounded-md bg-background/80 px-3 py-2 font-mono text-[11.5px] text-allow">
          {truncate(entry.result, 160)}
        </pre>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
