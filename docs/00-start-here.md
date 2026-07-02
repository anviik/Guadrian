# Guardian — Start Here (private notes)

These are personal walkthrough notes, written for *you* to read before we build.
They are not the README and not for judges — they explain the "why" behind every
piece so the code we write next isn't a black box.

Read order:

1. **`00-start-here.md`** ← you are here. The 60-second mental model.
2. **`01-architecture-walkthrough.md`** — the four layers and how a single action
   flows through the whole system.
3. **`02-graph-skeleton-explained.md`** — exactly what the code we're about to
   scaffold does, line by line, and what is *stubbed* vs. *real*.
4. **`03-roadmap.md`** — what comes after the skeleton, in the order I recommend.

---

## The 60-second mental model

Guardian is a **runtime governance layer** for AI agents. Strip away the buzzwords
and it is one sentence:

> A *worker* agent wants to do things. It is not allowed to do anything directly.
> A *guardian* agent inspects each proposed thing and says **allow / block / pause**.
> Allowed things are snapshotted first, so we can **undo** them.

That's it. Everything else is plumbing to make that real, visible, and honest.

### The one idea that makes this not-a-toy

Most "AI safety" in agent frameworks is a *prompt*: "please be careful." That's
advice, and the model can ignore it.

Guardian makes safety **structural**. The worker literally has no function it can
call to touch the filesystem. The only thing it can do is *emit a proposed action
as data*. That data has to pass through the guardian node of a state machine before
anything executes. The worker can't route around it — not because it's polite, but
because the graph has no edge that lets it.

This is the difference between a security *policy* and a security *boundary*. We're
building a boundary.

### The honest-scope rule (don't skip this)

We only operate on a **sandbox**: a local folder and some fake APIs. Why? Because
rollback only works if actions are reversible. You can restore a file from a
snapshot. You cannot un-send a real email or reverse a real wire transfer.

So we don't pretend to. The README and demo will say this out loud. The design doc
is blunt about it: reviewers from finance will *immediately* spot an overclaim, and
stating the boundary plainly reads as maturity, not weakness. Keep that framing.

### Vocabulary you'll see everywhere

- **Worker** — proposes actions, never executes them.
- **Guardian** — the control layer. Two stages: cheap deterministic rules first,
  then an LLM judge only for the genuinely ambiguous calls.
- **Verdict** — `allow`, `block`, or `pause`. Drives all routing.
- **Snapshot** — a copy of whatever an action is about to touch, taken *before* it
  runs.
- **Rollback stack** — a LIFO stack of snapshots. Pop + restore = undo.
- **Drift** — the worker is following every individual rule but has wandered away
  from the actual task. Rules can't catch this; the LLM judge can.

Next: `01-architecture-walkthrough.md`.
