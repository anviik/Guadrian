import type { Pulse } from "../types";

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
    <svg viewBox="0 0 640 330" className="graph">
      <defs>
        <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="#8b949e" />
        </marker>
      </defs>

      {/* edges (drawn under nodes). key on the active edge retriggers animation */}
      <path id="wg" key={pulse?.edge === "wg" ? pulse.key : "wg"} className={edgeClass("wg")}
        d="M150 165 L 255 165" markerEnd="url(#arrow)" />
      <path id="ge" key={pulse?.edge === "ge" ? pulse.key : "ge"} className={edgeClass("ge")}
        d="M385 165 L 490 165" markerEnd="url(#arrow)" />
      <path id="gw" key={pulse?.edge === "gw" ? pulse.key : "gw"} className={edgeClass("gw")}
        d="M320 195 C 300 250, 150 250, 95 195" markerEnd="url(#arrow)" />
      <path id="gh" key={pulse?.edge === "gh" ? pulse.key : "gh"} className={edgeClass("gh")}
        d="M320 135 C 330 80, 420 55, 490 55" markerEnd="url(#arrow)" />
      <path id="gr" key={pulse?.edge === "gr" ? pulse.key : "gr"} className={edgeClass("gr")}
        d="M345 195 C 380 240, 440 270, 490 275" markerEnd="url(#arrow)" />
      <path id="rw" key={pulse?.edge === "rw" ? pulse.key : "rw"} className={edgeClass("rw")}
        d="M490 290 C 300 320, 100 300, 90 195" markerEnd="url(#arrow)" />
      <path id="ew" className="edge edge-faint"
        d="M545 135 C 540 40, 150 40, 100 135" markerEnd="url(#arrow)" />

      {/* edge labels */}
      <text x="196" y="155" className="edge-label">proposes</text>
      <text x="408" y="155" className="edge-label v-allow-t">allow</text>
      <text x="205" y="245" className="edge-label v-block-t">block · re-plan</text>
      <text x="385" y="72" className="edge-label v-pause-t">pause</text>
      <text x="420" y="250" className="edge-label v-rollback-t">drift</text>
      <text x="255" y="322" className="edge-label v-rollback-t">restore known-good</text>
      <text x="290" y="34" className="edge-label">result · next action</text>

      {/* nodes */}
      <Node x={30} y={135} w={120} label="WORKER" sub="proposes only" kind="worker"
        active={status === "running"} />
      <Node x={255} y={135} w={130} label="GUARDIAN" sub="rules + judge" kind="guardian"
        active={status === "running"} />
      <Node x={490} y={135} w={120} label="EXECUTE" sub="snapshot → run" kind="execute" />
      <Node x={490} y={25} w={120} label="HUMAN" sub="approval" kind="human"
        active={status === "paused"} />
      <Node x={490} y={245} w={120} label="ROLLBACK" sub={`stack: ${stackDepth}`} kind="rollback" />
    </svg>
  );
}

function Node(props: {
  x: number; y: number; w: number;
  label: string; sub: string; kind: string; active?: boolean;
}) {
  const { x, y, w, label, sub, kind, active } = props;
  return (
    <g className={`node node-${kind}${active ? " node-active" : ""}`}>
      <rect x={x} y={y} width={w} height={60} rx={10} />
      <text x={x + w / 2} y={y + 27} className="node-label">{label}</text>
      <text x={x + w / 2} y={y + 45} className="node-sub">{sub}</text>
    </g>
  );
}
