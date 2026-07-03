"use client";

import type { Pulse } from "@/lib/types";

/** Fixed-layout live graph, drawn like a schematic: theme-aware inks, hairline
 *  edges that pulse in the verdict color as events arrive. */
export default function GraphView(props: {
  pulse: Pulse | null;
  status: string;
  stackDepth: number;
}) {
  const { pulse, status, stackDepth } = props;

  const edgeClass = (id: string) =>
    "edge" + (pulse?.edge === id ? ` edge-active v-${pulse.verdict}` : "");

  return (
    <div className="border border-border bg-card px-2 py-3">
      <svg viewBox="0 0 640 330" className="w-full">
        <defs>
          <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill="var(--muted-foreground)" opacity="0.55" />
          </marker>
        </defs>

        {/* edges (under nodes); key retriggers the pulse animation */}
        <path key={pulse?.edge === "wg" ? pulse.key : "wg"} className={edgeClass("wg")}
          d="M150 165 L 255 165" markerEnd="url(#arrow)" />
        <path key={pulse?.edge === "ge" ? pulse.key : "ge"} className={edgeClass("ge")}
          d="M385 165 L 490 165" markerEnd="url(#arrow)" />
        <path key={pulse?.edge === "gw" ? pulse.key : "gw"} className={edgeClass("gw")}
          d="M320 195 C 300 250, 150 250, 95 195" markerEnd="url(#arrow)" />
        <path key={pulse?.edge === "gh" ? pulse.key : "gh"} className={edgeClass("gh")}
          d="M320 135 C 330 80, 420 55, 490 55" markerEnd="url(#arrow)" />
        <path key={pulse?.edge === "gr" ? pulse.key : "gr"} className={edgeClass("gr")}
          d="M345 195 C 380 240, 440 270, 490 275" markerEnd="url(#arrow)" />
        <path key={pulse?.edge === "rw" ? pulse.key : "rw"} className={edgeClass("rw")}
          d="M490 290 C 300 320, 100 300, 90 195" markerEnd="url(#arrow)" />
        <path className="edge edge-faint"
          d="M545 135 C 540 40, 150 40, 100 135" markerEnd="url(#arrow)" />

        {/* edge labels */}
        <Label x={196} y={155}>proposes</Label>
        <Label x={408} y={155} fill="var(--allow)">allow</Label>
        <Label x={205} y={245} fill="var(--block)">block · re-plan</Label>
        <Label x={385} y={72} fill="var(--pause)">pause</Label>
        <Label x={420} y={250} fill="var(--rollback)">drift</Label>
        <Label x={255} y={322} fill="var(--rollback)">restore known-good</Label>
        <Label x={290} y={34}>result · next action</Label>

        {/* nodes */}
        <Node x={30} y={135} w={120} label="WORKER" sub="proposes only"
          stroke="var(--propose)" live={status === "running"} />
        <Node x={255} y={135} w={130} label="GUARDIAN" sub="rules + judge"
          stroke="var(--primary)" live={status === "running"} />
        <Node x={490} y={135} w={120} label="EXECUTE" sub="snapshot → run"
          stroke="var(--allow)" />
        <Node x={490} y={25} w={120} label="HUMAN" sub="approval"
          stroke="var(--pause)" dashed live={status === "paused"} />
        <Node x={490} y={245} w={120} label="ROLLBACK" sub={`stack: ${stackDepth}`}
          stroke="var(--rollback)" />
      </svg>
    </div>
  );
}

function Label(props: { x: number; y: number; fill?: string; children: React.ReactNode }) {
  return (
    <text x={props.x} y={props.y}
      fill={props.fill ?? "var(--muted-foreground)"}
      fontSize="10.5" fontFamily="var(--font-mono)">
      {props.children}
    </text>
  );
}

function Node(props: {
  x: number; y: number; w: number;
  label: string; sub: string; stroke: string;
  dashed?: boolean; live?: boolean;
}) {
  const { x, y, w, label, sub, stroke, dashed, live } = props;
  return (
    <g className={live ? "node-live" : undefined}>
      <rect x={x} y={y} width={w} height={60} rx={3}
        fill="var(--background)" stroke={stroke} strokeWidth={1.4}
        strokeDasharray={dashed ? "4 3" : undefined} />
      <text x={x + w / 2} y={y + 27} textAnchor="middle"
        fill="var(--foreground)" fontSize="13" fontWeight={600}
        letterSpacing="2" fontFamily="var(--font-mono)">
        {label}
      </text>
      <text x={x + w / 2} y={y + 45} textAnchor="middle"
        fill="var(--muted-foreground)" fontSize="10" fontFamily="var(--font-mono)">
        {sub}
      </text>
    </g>
  );
}
