"use client";

import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import ActionLog from "@/components/action-log";
import ApprovalModal from "@/components/approval-modal";
import GraphView from "@/components/graph-view";
import ThemeToggle from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuardian } from "@/lib/use-guardian";
import { cn } from "@/lib/utils";

const DEFAULT_TASK = "Tidy up the sandbox notes directory.";

export default function Console() {
  const { state, post } = useGuardian();
  const [task, setTask] = useState(DEFAULT_TASK);

  const running = state.status === "running";

  return (
    <div className="min-h-screen">
      {/* ── masthead ─────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 pt-6 pb-4">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-2xl tracking-tight">Guardian</span>
          <span className="spec">console</span>
        </Link>

        <StatusWord connected={state.connected} status={state.status} />

        <div className="ml-auto flex flex-1 items-center justify-end gap-2.5 sm:flex-none">
          <Input
            className="w-full max-w-sm rounded-none border-0 border-b border-input bg-transparent px-1 font-mono text-[13px] shadow-none focus-visible:ring-0 focus-visible:border-primary sm:w-80"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={running}
            placeholder="task for the worker agent…"
          />
          <Button
            className="rounded-none border border-foreground bg-foreground font-medium text-background hover:bg-transparent hover:text-foreground"
            disabled={running || !state.connected}
            onClick={() => post("run", { task })}
          >
            <Play className="size-3.5" /> Run
          </Button>
          <Button
            variant="outline"
            className="rounded-none"
            disabled={running || !state.connected}
            onClick={() => post("reset")}
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="rule-t mx-auto max-w-7xl px-6" />

      {(state.mode || state.banner) && (
        <div className="mx-auto max-w-7xl space-y-2 px-6 pt-3">
          {state.mode && <p className="spec">agents — {state.mode}</p>}
          {state.banner && (
            <div className="animate-in fade-in border-l-2 border-rollback bg-rollback/8 py-2 pl-4 pr-3 font-mono text-[12.5px] text-rollback">
              ⟲ {state.banner}
            </div>
          )}
        </div>
      )}

      {/* ── panels ───────────────────────────────────────────────── */}
      <main className="mx-auto grid max-w-7xl gap-x-10 gap-y-8 px-6 py-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-8">
          <section>
            <PanelHead n="01" title="agent graph" />
            <GraphView pulse={state.pulse} status={state.status} stackDepth={state.stackDepth} />
          </section>

          <section>
            <PanelHead n="02" title="sandbox contents" />
            <pre className="min-h-12 whitespace-pre-wrap border border-border bg-card px-4 py-3 font-mono text-xs leading-relaxed">
              {state.sandbox || "  (empty)"}
            </pre>
          </section>
        </div>

        <section>
          <PanelHead
            n="03"
            title="ledger"
            right={state.task ? `“${state.task}”` : undefined}
          />
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

      <footer className="rule-t mx-auto max-w-7xl px-6 py-8">
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
          <span className="font-mono">*</span> Rollback is demonstrated on a
          sandboxed filesystem + mock APIs, where every action is genuinely
          reversible. The LLM judge is probabilistic defense-in-depth alongside the
          deterministic rule layer, not a guarantee.
        </p>
      </footer>
    </div>
  );
}

function PanelHead(props: { n: string; title: string; right?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-border pb-2">
      <span className="spec">
        <span className="mr-2 text-foreground/70">{props.n}</span>
        {props.title}
      </span>
      {props.right && (
        <span className="truncate font-display text-sm italic text-muted-foreground">
          {props.right}
        </span>
      )}
    </div>
  );
}

function StatusWord(props: { connected: boolean; status: string }) {
  const label = props.connected ? props.status : "offline";
  return (
    <span
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.22em]",
        label === "running" && "text-propose",
        label === "paused" && "text-pause",
        label === "idle" && "text-muted-foreground",
        label === "offline" && "text-block",
      )}
    >
      <span
        className={cn(
          "mr-2 inline-block size-1.5 rounded-full align-middle",
          label === "running" && "animate-pulse bg-propose",
          label === "paused" && "bg-pause",
          label === "idle" && "bg-muted-foreground/60",
          label === "offline" && "bg-block",
        )}
      />
      {label}
    </span>
  );
}
