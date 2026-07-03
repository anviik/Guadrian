"use client";

import { useState } from "react";
import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Action } from "@/lib/types";

/** Raised when the guardian returns PAUSE: a human decides, the graph waits. */
export default function ApprovalModal(props: {
  action: Action;
  reason: string;
  onApprove: () => void;
  onDeny: (reason: string) => void;
}) {
  const [denyReason, setDenyReason] = useState("");

  return (
    <Dialog open>
      <DialogContent
        className="border-pause/50 sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-pause">
            <PauseCircle className="size-5" /> Human review required
          </DialogTitle>
          <DialogDescription className="text-left">{props.reason}</DialogDescription>
        </DialogHeader>

        <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background/80 px-4 py-3 font-mono text-xs leading-relaxed">
          {JSON.stringify(props.action, null, 2)}
        </pre>

        <Input
          placeholder="optional deny reason…"
          value={denyReason}
          onChange={(e) => setDenyReason(e.target.value)}
        />

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-block/50 text-block hover:bg-block/10 hover:text-block"
            onClick={() => props.onDeny(denyReason)}
          >
            Deny
          </Button>
          <Button
            className="bg-allow font-semibold text-background hover:bg-allow/85"
            onClick={props.onApprove}
          >
            Approve &amp; execute
          </Button>
        </DialogFooter>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Approval cannot waive the sandbox boundary — that rule outranks everyone.
        </p>
      </DialogContent>
    </Dialog>
  );
}
