"use client";

import { useState } from "react";
import { FolderTree, Play, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import ActionLog from "@/components/action-log";
import ApprovalModal from "@/components/approval-modal";
import GraphView from "@/components/graph-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useGuardian } from "@/lib/use-guardian";
import { cn } from "@/lib/utils";

const DEFAULT_TASK = "Tidy up the sandbox notes directory.";

export default function Console() {
  const { state, post } = useGuardian();
  const [task, setTask] = useState(DEFAULT_TASK);

  const running = state.status === "running";

  return (
    <div className="relative min-h-screen">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-64" />

      {/* top bar */}
      <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 pr-2">
          <ShieldCheck className="size-5 text-primary" />
          <span className="font-semibold tracking-[0.2em]">GUARDIAN</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">console</span>
        </Link>

        <div className="ml-auto flex flex-1 items-center justify-end gap-2.5 sm:flex-none">
          <StatusPill connected={state.connected} status={state.status} />
          <Input
            className="w-full max-w-sm sm:w-80"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={running}
            placeholder="task for the worker agent…"
          />
          <Button
            className="rounded-full font-semibold shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            disabled={running || !state.connected}
            onClick={() => post("run", { task })}
          >
            <Play className="size-4" /> Run
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={running || !state.connected}
            onClick={() => post("reset")}
          >
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
      </header>

      {(state.mode || state.banner) && (
        <div className="relative z-10 mx-auto max-w-7xl space-y-2 px-6 pb-2">
          {state.mode && (
            <p className="text-xs text-muted-foreground">agents: {state.mode}</p>
          )}
          {state.banner && (
            <div className="animate-in fade-in rounded-lg border border-rollback/50 bg-rollback/10 px-4 py-2.5 text-sm text-rollback">
              ⟲ {state.banner}
            </div>
          )}
        </div>
      )}

      {/* panels */}
      <main className="relative z-10 mx-auto grid max-w-7xl gap-4 px-6 pb-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="glass rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Agent graph
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GraphView pulse={state.pulse} status={state.status} stackDepth={state.stackDepth} />
            </CardContent>
          </Card>

          <Card className="glass rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <FolderTree className="size-3.5" /> Sandbox contents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="min-h-12 whitespace-pre-wrap rounded-lg bg-background/80 px-4 py-3 font-mono text-xs leading-relaxed">
                {state.sandbox || "  (empty)"}
              </pre>
            </CardContent>
          </Card>
        </div>

        <Card className="glass rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Action log
              {state.task && (
                <span className="ml-2 normal-case tracking-normal text-foreground/70">
                  — {state.task}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionLog log={state.log} />
          </CardContent>
        </Card>
      </main>

      {state.status === "paused" && state.pending && (
        <ApprovalModal
          action={state.pending}
          reason={state.pendingReason}
          onApprove={() => post("approve")}
          onDeny={(reason) => post("deny", { reason })}
        />
      )}

      <footer className="relative z-10 mx-auto max-w-7xl px-6 pb-8">
        <Separator className="mb-4" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Scope honesty: rollback is demonstrated on a sandboxed filesystem + mock
          APIs, where every action is genuinely reversible. The LLM judge is
          probabilistic defense-in-depth alongside the deterministic rule layer, not
          a guarantee.
        </p>
      </footer>
    </div>
  );
}

function StatusPill(props: { connected: boolean; status: string }) {
  const label = props.connected ? props.status : "offline";
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest",
        label === "running" && "border-propose/60 text-propose",
        label === "paused" && "border-pause/60 text-pause",
        label === "idle" && "text-muted-foreground",
        label === "offline" && "border-block/60 text-block",
      )}
    >
      <span
        className={cn(
          "mr-1.5 inline-block size-1.5 rounded-full",
          label === "running" && "animate-pulse bg-propose",
          label === "paused" && "bg-pause",
          label === "idle" && "bg-muted-foreground",
          label === "offline" && "bg-block",
        )}
      />
      {label}
    </Badge>
  );
}
