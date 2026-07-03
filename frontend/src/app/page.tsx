import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* ── masthead ─────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-6xl items-baseline justify-between px-6 pt-8 pb-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-2xl tracking-tight">Guardian</span>
          <span className="spec hidden sm:inline">runtime governance · v0.6</span>
        </div>
        <nav className="flex items-center gap-5">
          <a
            className="ink-link hidden text-sm text-muted-foreground sm:inline"
            href="https://github.com/anviik/Guadrian"
            target="_blank"
            rel="noreferrer"
          >
            source
          </a>
          <Link className="ink-link text-sm" href="/console/">
            console
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <div className="rule-t mx-auto max-w-6xl px-6" />

      {/* ── hero: asymmetric, spec column right ──────────────────── */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-14 md:grid-cols-[1.6fr_1fr] md:gap-16">
        <div>
          <p className="spec mb-8">§ 01 — the premise</p>
          <h1 className="font-display text-[clamp(3rem,8vw,5.8rem)] leading-[1.02] tracking-tight">
            Every action
            <br />
            <em className="text-primary">asks permission</em>
            <br />
            before it exists.
          </h1>
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            A worker agent proposes. A guardian agent disposes — allow, block,
            pause — before anything touches the world. Every allowed action is
            snapshotted first, so detected drift rolls the world back.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <Link
              href="/console/"
              className="group inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-transparent hover:text-foreground"
            >
              Enter the console
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <span className="spec">no api key needed</span>
          </div>
        </div>

        {/* spec sheet */}
        <aside className="rule-t space-y-0 pt-5 md:border-t-0 md:pt-1">
          <SpecRow k="architecture" v="LangGraph state machine" />
          <SpecRow k="interception" v="structural — no bypass edge" />
          <SpecRow k="stage one" v="deterministic YAML policy" />
          <SpecRow k="stage two" v="LLM judge, ambiguous only" />
          <SpecRow k="reversal" v="LIFO snapshot stack" />
          <SpecRow k="scope" v="sandboxed fs + mock APIs" />
          <SpecRow k="transport" v="WebSocket, no polling" />
        </aside>
      </section>

      {/* ── verdict ticker ───────────────────────────────────────── */}
      <div className="rule-t ticker border-b border-border py-3" aria-hidden>
        <div className="ticker-track">
          {[0, 1].map((i) => (
            <span key={i} className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
              <Tick c="text-allow" t="ALLOW" d="write_file sandbox/notes/plan.txt" />
              <Tick c="text-block" t="BLOCK" d="delete_file sandbox/../etc/hosts" />
              <Tick c="text-rollback" t="ROLLBACK" d="sync_to_cloud — drift detected" />
              <Tick c="text-pause" t="PAUSE" d="send_email awaiting human" />
              <Tick c="text-allow" t="ALLOW" d="append_file sandbox/notes/plan.txt" />
            </span>
          ))}
        </div>
      </div>

      {/* ── index: 01 / 02 / 03 ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="spec mb-10">§ 02 — the mechanism</p>
        <IndexRow
          n="01"
          title="Intercept"
          body="The worker has no function that touches the filesystem. Its only output is a proposed action — data, not a call. The graph simply has no edge from worker to execution."
          note="oversight is structural, not advisory"
        />
        <IndexRow
          n="02"
          title="Evaluate"
          body="Cheapest first: deterministic YAML rules catch the obvious instantly. Only the genuinely ambiguous escalates to an LLM judge, which asks one question — does this still serve the task?"
          note="drift detection lives in the judge"
        />
        <IndexRow
          n="03"
          title="Roll back"
          body="Before any allowed action runs, its target is snapshotted onto a stack. When the judge flags drift, the stack pops and the file on disk visibly reverts to its last known-good state."
          note="the strongest moment in the demo"
          last
        />
      </section>

      {/* ── flow, typographically ─────────────────────────────────── */}
      <section className="rule-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="spec mb-10">§ 03 — one action, end to end</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-6 font-mono text-[13px]">
            <span className="border border-border bg-card px-4 py-2.5">worker proposes</span>
            <Arrow />
            <span className="border border-border bg-card px-4 py-2.5">guardian judges</span>
            <Arrow />
            <span className="flex flex-col gap-2">
              <span><span className="stamp text-allow">ALLOW</span><Sub> snapshot → execute → next</Sub></span>
              <span><span className="stamp text-block">BLOCK</span><Sub> reason → worker re-plans</Sub></span>
              <span><span className="stamp text-pause">PAUSE</span><Sub> a human decides</Sub></span>
              <span><span className="stamp text-rollback">ROLLBACK</span><Sub> restore known-good</Sub></span>
            </span>
          </div>
        </div>
      </section>

      {/* ── footnote / colophon ───────────────────────────────────── */}
      <footer className="rule-t mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-[1fr_auto]">
          <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-mono">*</span> Scope, stated honestly: rollback is
            demonstrated on a sandboxed filesystem and mock APIs, where every action
            is genuinely reversible. Guardian does not claim to reverse irreversible
            real-world effects. The LLM judge is probabilistic defense-in-depth
            alongside the deterministic rule layer — not a guarantee.
          </p>
          <p className="spec self-end text-right">
            langgraph · fastapi · websockets · next.js
            <br />
            futureai global hackathon 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

function SpecRow(props: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3">
      <span className="spec">{props.k}</span>
      <span className="text-right font-mono text-xs">{props.v}</span>
    </div>
  );
}

function Tick(props: { c: string; t: string; d: string }) {
  return (
    <span className="mx-6">
      <span className={`${props.c} font-bold`}>{props.t}</span>
      <span className="mx-2 opacity-40">/</span>
      {props.d}
    </span>
  );
}

function IndexRow(props: {
  n: string;
  title: string;
  body: string;
  note: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid gap-4 border-t border-border py-9 md:grid-cols-[80px_1fr_1.8fr_auto] md:gap-8 ${
        props.last ? "border-b" : ""
      }`}
    >
      <span className="font-display text-4xl text-muted-foreground/60">{props.n}</span>
      <h3 className="font-display text-3xl tracking-tight">{props.title}</h3>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{props.body}</p>
      <span className="spec self-end md:max-w-40 md:text-right">{props.note}</span>
    </div>
  );
}

function Arrow() {
  return <span className="text-muted-foreground">→</span>;
}

function Sub(props: { children: React.ReactNode }) {
  return <span className="ml-3 text-xs text-muted-foreground">{props.children}</span>;
}
