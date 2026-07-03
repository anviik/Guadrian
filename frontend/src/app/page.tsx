import {
  ArrowRight,
  Eye,
  FileCheck2,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" />

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-6 text-primary" />
          <span className="text-lg font-semibold tracking-[0.2em]">GUARDIAN</span>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/console/">
            Launch console <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
        <Badge
          variant="outline"
          className="mb-6 rounded-full border-primary/40 px-4 py-1 text-xs tracking-widest text-primary"
        >
          RUNTIME GOVERNANCE FOR AI AGENTS
        </Badge>
        <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          Agents act.
          <br />
          <span className="text-glow-cyan text-primary">Guardian decides.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          A live oversight layer where a worker agent has no direct path to its
          environment. Every proposed action is evaluated before it executes —
          allowed, blocked, or paused for a human — and every executed action can
          be rolled back.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button asChild size="lg" className="rounded-full px-8 font-semibold shadow-[0_0_32px_rgba(34,211,238,0.35)]">
            <Link href="/console/">
              Watch it live <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-full text-muted-foreground">
            <a href="https://github.com/anviik/Guadrian" target="_blank" rel="noreferrer">
              View source
            </a>
          </Button>
        </div>
      </section>

      {/* how it works */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          <Feature
            icon={<Eye className="size-5 text-propose" />}
            title="Intercept"
            body="The worker only emits proposed actions as data. The graph has no edge from worker to execution — oversight is structural, not advisory."
          />
          <Feature
            icon={<Zap className="size-5 text-pause" />}
            title="Evaluate"
            body="Two stages, cheapest first: deterministic YAML policy rules, then an LLM judge only for the genuinely ambiguous — where drift detection lives."
          />
          <Feature
            icon={<RotateCcw className="size-5 text-rollback" />}
            title="Roll back"
            body="Every allowed action is snapshotted before it runs. Detected drift pops the stack and restores the last known-good state — visibly, on disk."
          />
        </div>

        {/* verdict strip */}
        <Card className="glass mt-12 rounded-2xl">
          <CardContent className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-8 py-6">
            <Verdict color="text-allow" label="ALLOW" note="snapshot → execute" />
            <Verdict color="text-block" label="BLOCK" note="reason → worker re-plans" />
            <Verdict color="text-pause" label="PAUSE" note="human decides" />
            <Verdict color="text-rollback" label="ROLLBACK" note="restore known-good" />
          </CardContent>
        </Card>

        {/* scope honesty */}
        <div className="mt-12 flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 px-6 py-5 text-sm leading-relaxed text-muted-foreground">
          <FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary/70" />
          <p>
            <span className="font-medium text-foreground">Scope, stated honestly:</span>{" "}
            rollback is demonstrated on a sandboxed filesystem and mock APIs, where
            every action is genuinely reversible. Guardian does not claim to reverse
            irreversible real-world effects — and the LLM judge is probabilistic
            defense-in-depth alongside the deterministic rule layer, not a guarantee.
          </p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        <GitBranch className="mr-1.5 inline size-3.5" />
        LangGraph · FastAPI · WebSockets · Next.js — FutureAI Global Hackathon 2026
      </footer>
    </div>
  );
}

function Feature(props: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="glass rounded-2xl transition-colors hover:border-primary/30">
      <CardContent className="px-6 py-6">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-secondary">
          {props.icon}
        </div>
        <h3 className="mb-2 text-base font-semibold">{props.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{props.body}</p>
      </CardContent>
    </Card>
  );
}

function Verdict(props: { color: string; label: string; note: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`${props.color} font-mono text-sm font-bold tracking-wider`}>
        {props.label}
      </span>
      <span className="text-xs text-muted-foreground">{props.note}</span>
    </div>
  );
}
