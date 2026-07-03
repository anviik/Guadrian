"""FastAPI server (Step 5): runs the Guardian graph and streams it live.

The frontend subscribes ONCE to /ws and renders each incoming event — no polling.
Every LangGraph state transition becomes a typed event as it happens, so the
visualization is synchronized with the actual agent run, not a replay.

Run it (from backend/):

    uvicorn server:app --reload --port 8000

In development the Next.js frontend runs separately (`npm run dev`, port 3000)
and talks to this server cross-origin; the built export (frontend/out) is served
by this app directly.

Endpoints:
    GET  /api/state    current session snapshot (also sent on WS connect)
    POST /api/run      {"task": "..."} start a run (409 if one is running)
    POST /api/approve  execute the paused action with explicit human approval
    POST /api/deny     {"reason": "..."} reject the paused action; the run continues
    POST /api/reset    wipe the sandbox for a clean demo
    WS   /ws           live event stream

If frontend/dist exists (npm run build), it is served at / for a one-command demo.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agents import build_agents
from graph.build import build_graph
from graph.state import initial_state
from policy.engine import load_policy
from sandbox import Sandbox


# ---------------------------------------------------------------------------
# WebSocket broadcast
# ---------------------------------------------------------------------------

class Broadcaster:
    def __init__(self):
        self._clients: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def send(self, event: dict) -> None:
        for ws in list(self._clients):
            try:
                await ws.send_json(event)
            except Exception:
                self._clients.discard(ws)


# ---------------------------------------------------------------------------
# One Guardian session (single active run — a demo server, deliberately)
# ---------------------------------------------------------------------------

class Session:
    def __init__(self, broadcaster: Broadcaster):
        self.bus = broadcaster
        self.policy = load_policy()
        self.sandbox = Sandbox(root=self.policy.sandbox_root)
        self.status = "idle"          # idle | running | paused
        self.mode = ""
        self.state: dict = initial_state("")
        self.graph = None             # rebuilt per run; holds the (stateful) worker
        self._seq = 0

    def snapshot(self) -> dict:
        return {
            "status": self.status,
            "mode": self.mode,
            "task": self.state["task"],
            "action_log": self.state["action_log"],
            "stack_depth": len(self.state["rollback_stack"]),
            "pending": self.state.get("proposed_action") if self.status == "paused" else None,
            "sandbox": self.sandbox.tree(),
        }

    async def emit(self, type_: str, **payload) -> None:
        self._seq += 1
        await self.bus.send({"type": type_, "seq": self._seq, **payload})

    # -- run lifecycle ---------------------------------------------------------

    def start(self, task: str) -> None:
        if self.status == "running":
            raise HTTPException(409, "a run is already in progress")
        worker, judge, self.mode = build_agents(self.policy)
        self.graph = build_graph(worker=worker, policy=self.policy,
                                 sandbox=self.sandbox, judge=judge)
        self.state = initial_state(task)
        asyncio.create_task(self._run(first=True))

    def approve(self) -> None:
        action = self._take_pending()
        self.state["resume_action"] = {**action, "human_approved": True}
        asyncio.create_task(self._run())

    def deny(self, reason: str) -> None:
        action = self._take_pending()
        # Record the denial in the audit log so the worker (and UI) see why.
        self.state["action_log"] = self.state["action_log"] + [
            {"action": action, "verdict": "denied",
             "reason": reason or "denied by human reviewer", "stage": "human"}
        ]
        self.state["proposed_action"] = None
        asyncio.create_task(self._run(denied=action, deny_reason=reason))

    def _take_pending(self) -> dict:
        if self.status != "paused" or not self.state.get("proposed_action"):
            raise HTTPException(409, "no action is awaiting review")
        self.status = "running"
        return self.state["proposed_action"]

    # -- the run loop ------------------------------------------------------------

    async def _run(self, first: bool = False, denied: Optional[dict] = None,
                   deny_reason: str = "") -> None:
        self.status = "running"
        if first:
            await self.emit("run_started", task=self.state["task"], mode=self.mode)
        if denied is not None:
            await self.emit("denied", action=denied,
                            reason=deny_reason or "denied by human reviewer")

        try:
            async for chunk in self.graph.astream(
                self.state, config={"recursion_limit": 100}, stream_mode="updates"
            ):
                for node, update in chunk.items():
                    self.state = {**self.state, **(update or {})}
                    await self._emit_node_event(node, update or {})
        except Exception as exc:
            self.status = "idle"
            await self.emit("error", message=str(exc))
            return

        if self.state.get("guardian_verdict") == "pause" and self.state.get("proposed_action"):
            self.status = "paused"
            await self.emit("paused", action=self.state["proposed_action"],
                            reason=self.state["guardian_reason"])
        else:
            self.status = "idle"
            executed = sum(1 for e in self.state["action_log"] if "result" in e)
            await self.emit("run_complete", judged=len(self.state["action_log"]),
                            executed=executed,
                            stack_depth=len(self.state["rollback_stack"]),
                            sandbox=self.sandbox.tree())

    async def _emit_node_event(self, node: str, update: dict) -> None:
        log = self.state["action_log"]
        last = log[-1] if log else {}
        if node == "worker":
            action = update.get("proposed_action")
            if action is not None:
                await self.emit("proposal", action=action)
        elif node == "guardian":
            await self.emit("verdict", action=last.get("action"),
                            verdict=last.get("verdict"), reason=last.get("reason"),
                            stage=last.get("stage"))
        elif node == "execute":
            await self.emit("executed", action=last.get("action"),
                            result=last.get("result"),
                            stack_depth=len(self.state["rollback_stack"]))
        elif node == "rollback":
            await self.emit("rollback", restored=update.get("last_restored"),
                            stack_depth=len(self.state["rollback_stack"]))


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------

app = FastAPI(title="Guardian")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

bus = Broadcaster()
session = Session(bus)


class RunRequest(BaseModel):
    task: str


class DenyRequest(BaseModel):
    reason: str = ""


@app.get("/api/state")
async def get_state():
    return session.snapshot()


@app.post("/api/run")
async def start_run(req: RunRequest):
    session.start(req.task.strip() or "Tidy up the sandbox notes directory.")
    return {"ok": True}


@app.post("/api/approve")
async def approve():
    session.approve()
    return {"ok": True}


@app.post("/api/deny")
async def deny(req: DenyRequest):
    session.deny(req.reason)
    return {"ok": True}


@app.post("/api/reset")
async def reset():
    if session.status == "running":
        raise HTTPException(409, "cannot reset mid-run")
    session.sandbox.wipe()
    session.state = initial_state("")
    session.status = "idle"
    await session.emit("reset")
    return {"ok": True}


@app.websocket("/ws")
async def websocket(ws: WebSocket):
    await bus.connect(ws)
    try:
        await ws.send_json({"type": "hello", "state": session.snapshot()})
        while True:
            await ws.receive_text()  # keepalive; clients don't need to send anything
    except WebSocketDisconnect:
        bus.disconnect(ws)


# Serve the built frontend (if present) for a one-command demo.
# `npm run build` in frontend/ produces a Next.js static export in out/.
_DIST = Path(__file__).resolve().parents[1] / "frontend" / "out"
if _DIST.is_dir():
    app.mount("/", StaticFiles(directory=_DIST, html=True), name="frontend")
