"use client";

import { useState } from "react";
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
        className="rounded-none border-pause/60 sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="stamp text-pause">PAUSE</span>
            <span className="font-display text-xl font-normal tracking-tight">
              A human decides.
            </span>
          </DialogTitle>
          <DialogDescription className="text-left">{props.reason}</DialogDescription>
        </DialogHeader>

        <pre className="overflow-x-auto border border-border bg-muted/50 px-4 py-3 font-mono text-xs leading-relaxed">
          {JSON.stringify(props.action, null, 2)}
        </pre>

        <Input
          className="rounded-none border-0 border-b border-input bg-transparent px-1 font-mono text-[13px] shadow-none focus-visible:ring-0 focus-visible:border-primary"
          placeholder="optional deny reason…"
          value={denyReason}
          onChange={(e) => setDenyReason(e.target.value)}
        />

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-none border-block/60 text-block hover:bg-block/10 hover:text-block"
            onClick={() => props.onDeny(denyReason)}
          >
            Deny
          </Button>
          <Button
            className="rounded-none border border-foreground bg-foreground font-medium text-background hover:bg-transparent hover:text-foreground"
            onClick={props.onApprove}
          >
            Approve &amp; execute
          </Button>
        </DialogFooter>

        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-mono">*</span> approval cannot waive the sandbox
          boundary — that rule outranks everyone.
        </p>
      </DialogContent>
    </Dialog>
  );
}
