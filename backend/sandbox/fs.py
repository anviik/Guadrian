"""The reversible target environment (Step 4).

Everything the worker affects lives under one sandbox directory. Filesystem tools
operate on real files inside it; "external" tools (send_email, charge_card, anything
unrecognized) are mocked as records written to `sandbox/outbox/`. That keeps every
effect file-backed — which is exactly what makes true rollback possible, and is the
honest scope of this build (see the README).

Rollback is snapshot-based: `capture_state(target)` is taken BEFORE an allowed action
runs, and `restore_state(snapshot)` undoes it byte-for-byte (including re-deleting a
file the action created).

Containment is defense-in-depth: the guardian's policy layer blocks sandbox escapes
before execution is ever reached, and `_resolve()` here *also* refuses to touch a
path outside the sandbox root. If SandboxViolation ever raises, the guardian was
bypassed — that is a bug, not a recoverable condition.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

# Default working directory: the repo root (two levels up from backend/sandbox/).
# Overridable for tests / deployments via GUARDIAN_WORKDIR or the base_dir arg.
REPO_ROOT = Path(__file__).resolve().parents[2]


class SandboxViolation(Exception):
    """An action tried to touch a path outside the sandbox root."""


class Sandbox:
    READ_TOOLS = {"read_file", "list_dir", "stat_file"}
    FS_TOOLS = READ_TOOLS | {"write_file", "append_file", "delete_file"}

    def __init__(self, base_dir: Optional[str | Path] = None, root: str = "sandbox/"):
        self.base = Path(base_dir or os.getenv("GUARDIAN_WORKDIR") or REPO_ROOT).resolve()
        self.root = root
        self.root_path = (self.base / root).resolve()
        self.root_path.mkdir(parents=True, exist_ok=True)

    # -- containment ---------------------------------------------------------

    def _resolve(self, target: str) -> Path:
        path = (self.base / target).resolve()
        if not (path == self.root_path or path.is_relative_to(self.root_path)):
            raise SandboxViolation(
                f"'{target}' resolves outside the sandbox root — the guardian "
                f"should have blocked this before execution"
            )
        return path

    # -- what an action touches ----------------------------------------------

    def is_mutating(self, tool: str) -> bool:
        return tool not in self.READ_TOOLS

    def effect_target(self, action: dict) -> str:
        """The sandbox path an action will actually affect — snapshot this.

        Filesystem tools affect their own target. Every other tool is mocked as a
        record appended under outbox/, so its 'effect' is the record file it will
        create; snapshotting that file makes even mock API calls reversible.
        """
        tool = action["tool"]
        if tool in self.FS_TOOLS:
            return action["target"]
        outbox = self.root_path / "outbox"
        outbox.mkdir(parents=True, exist_ok=True)
        n = sum(1 for p in outbox.iterdir() if p.name.startswith(tool)) + 1
        return str(Path(self.root) / "outbox" / f"{tool}_{n:03d}.txt")

    # -- snapshot / restore (the rollback primitives) --------------------------

    def capture_state(self, target: str) -> dict:
        path = self._resolve(target)
        existed = path.is_file()
        return {
            "target": target,
            "existed": existed,
            "content": path.read_text() if existed else None,
        }

    def restore_state(self, snapshot: dict) -> None:
        path = self._resolve(snapshot["target"])
        if snapshot["existed"]:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(snapshot["content"])
        elif path.is_file():
            path.unlink()  # the action created it; restoring means removing it

    # -- execution -------------------------------------------------------------

    def run_action(self, action: dict, effect: Optional[str] = None) -> str:
        """Run one allowed action for real. Returns a human-readable result string."""
        tool = action["tool"]
        target = action.get("target", "")
        content = action.get("content", "")

        if tool == "write_file":
            path = self._resolve(target)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
            return f"wrote {len(content)} chars to {target}"

        if tool == "append_file":
            path = self._resolve(target)
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "a") as f:
                f.write(content)
            return f"appended {len(content)} chars to {target}"

        if tool == "delete_file":
            path = self._resolve(target)
            if path.is_file():
                path.unlink()
                return f"deleted {target}"
            return f"{target} did not exist"

        if tool == "read_file":
            path = self._resolve(target)
            if not path.is_file():
                return f"{target} does not exist"
            return path.read_text()

        if tool == "list_dir":
            path = self._resolve(target)
            if not path.is_dir():
                return f"{target} is not a directory"
            names = sorted(p.name + ("/" if p.is_dir() else "") for p in path.iterdir())
            return ", ".join(names) if names else "(empty)"

        if tool == "stat_file":
            path = self._resolve(target)
            if not path.is_file():
                return f"{target} does not exist"
            return f"{target}: {path.stat().st_size} bytes"

        # Anything else is an external-effect tool. This build mocks it as a record
        # under outbox/ — file-backed, so the effect is reversible like everything
        # else. (Scope honesty: a real send_email could not be rolled back.)
        effect = effect or self.effect_target(action)
        path = self._resolve(effect)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"[mock {tool}]\ntarget: {target}\ncontent: {content}\n")
        return f"mock '{tool}' recorded to {effect}"

    # -- demo/debug helper ------------------------------------------------------

    def tree(self) -> str:
        """A small listing of the sandbox contents, for terminal demo output."""
        lines = []
        for path in sorted(self.root_path.rglob("*")):
            rel = path.relative_to(self.root_path)
            if path.is_file():
                lines.append(f"  {rel}  ({path.stat().st_size} bytes)")
        return "\n".join(lines) if lines else "  (empty)"
