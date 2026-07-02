import { useState } from "react";
import type { Action } from "../types";

/** Raised when the guardian returns PAUSE: a human decides, the graph waits. */
export default function ApprovalModal(props: {
  action: Action;
  reason: string;
  onApprove: () => void;
  onDeny: (reason: string) => void;
}) {
  const [denyReason, setDenyReason] = useState("");

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>⏸ Human review required</h2>
        <p className="modal-reason">{props.reason}</p>
        <pre className="modal-action">{JSON.stringify(props.action, null, 2)}</pre>
        <input
          className="modal-input"
          placeholder="optional deny reason…"
          value={denyReason}
          onChange={(e) => setDenyReason(e.target.value)}
        />
        <div className="modal-buttons">
          <button className="btn btn-deny" onClick={() => props.onDeny(denyReason)}>
            Deny
          </button>
          <button className="btn btn-approve" onClick={props.onApprove}>
            Approve &amp; execute
          </button>
        </div>
        <p className="modal-note">
          Approval cannot waive the sandbox boundary — that rule outranks everyone.
        </p>
      </div>
    </div>
  );
}
