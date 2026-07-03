"use client";

import type { Pulse } from "@/lib/types";

/** Fixed-layout live graph. Edges pulse in the verdict color as events arrive:
 *  worker→guardian on every proposal, guardian→execute green on ALLOW,
 *  guardian→worker red on BLOCK, guardian→human amber on PAUSE, and the
 *  rollback path purple when drift is detected. */
export default function GraphView(props: {
  pulse: Pulse | null;
  status: string;
  stackDepth: number;
}) {
  const { pulse, status, stackDepth } = props;

  const edgeClass = (id: string) =>
    "edge" + (pulse?.edge === id ? ` edge-active v-${pulse.verdict}` : "");

  return (
    <svg viewBox="0 0 640 330" className="w-full">
      <defs>
        <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="rgba(139,147,167,0.5)" />
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
      <Label x={408} y={155} className="fill-allow">allow</Label>
      <Label x={205} y={245} className="fill-block">block · re-plan</Label>
      <Label x={385} y={72} className="fill-pause">pause</Label>
      <Label x={420} y={250} className="fill-rollback">drift</Label>
      <Label x={255} y={322} className="fill-rollback">restore known-good</Label>
      <Label x={290} y={34}>result · next action</Label>

      {/* nodes */}
      <Node x={30} y={135} w={120} label="WORKER" sub="proposes only"
        stroke="var(--propose)" live={status === "running"} />
      <Node x={255} y={135} w={130} label="GUARDIAN" sub="rules + judge"
        stroke="var(--pause)" live={status === "running"} />
      <Node x={490} y={135} w={120} label="EXECUTE" sub="snapshot → run"
        stroke="var(--allow)" />
      <Node x={490} y={25} w={120} label="HUMAN" sub="approval"
        stroke="var(--pause)" dashed live={status === "paused"} />
      <Node x={490} y={245} w={120} label="ROLLBACK" sub={`stack: ${stackDepth}`}
        stroke="var(--rollback)" />
    </svg>
  );
}

function Label(props: { x: number; y: number; className?: string; children: React.ReactNode }) {
  return (
    <text x={props.x} y={props.y}
      className={props.className ?? "fill-muted-foreground"}
      fontSize="10.5">
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
      <rect x={x} y={y} width={w} height={60} rx={12}
        fill="rgba(20,24,36,0.85)" stroke={stroke} strokeWidth={1.5}
        strokeDasharray={dashed ? "4 3" : undefined} />
      <text x={x + w / 2} y={y + 27} textAnchor="middle"
        className="fill-foreground" fontSize="13.5" fontWeight={700} letterSpacing="1.5">
        {label}
      </text>
      <text x={x + w / 2} y={y + 45} textAnchor="middle"
        className="fill-muted-foreground" fontSize="10.5">
        {sub}
      </text>
    </g>
  );
}
