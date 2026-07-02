"""Stage 1 of the guardian: the deterministic rule engine.

`check_policy_rules(action, policy)` returns one of four verdicts, ordered
cheapest-and-most-certain first:

    "block"     — a hard constraint is violated; the worker must try something else.
    "pause"     — needs a human (destructive, or an unconfirmed paid-API call).
    "allow"     — a recognized, safe operation inside the sandbox.
    "ambiguous" — no hard rule applies; defer to the LLM judge (Step 3).

This stage is fast, deterministic, and auditable — exactly the properties you want
for the rules that matter most. It never makes a model call. Semantic "drift"
detection (an action that breaks no rule but has wandered off-task) is NOT handled
here; that is Stage 2's job.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Tuple

import yaml

DEFAULT_POLICY_PATH = Path(__file__).parent / "policy.yaml"

# The verdict returned when no hard rule decides AND the policy provides no override.
_FAILSAFE = "pause"


class Policy:
    """Parsed view of policy.yaml. Construct from a dict (tests) or via load_policy()."""

    def __init__(self, data: dict):
        self.sandbox_root: str = data.get("sandbox_root", "sandbox/")
        self.max_records: int = data.get("max_records_per_action", 50)
        self.destructive_tools: set = set(data.get("destructive_tools", []))
        self.paid_api_tools: set = set(data.get("paid_api_tools", []))
        self.safe_tools: set = set(data.get("safe_tools", []))
        self.write_tools: set = set(data.get("write_tools", []))
        self.on_ambiguous: str = data.get("on_ambiguous", _FAILSAFE)


def load_policy(path=None) -> Policy:
    """Load and parse policy.yaml. Defaults to the file next to this module."""
    path = Path(path) if path else DEFAULT_POLICY_PATH
    with open(path) as f:
        data = yaml.safe_load(f) or {}
    return Policy(data)


def _within_sandbox(target: str, root: str) -> bool:
    """True only if `target` resolves to a path inside (or equal to) `root`.

    Uses normpath so a traversal attempt like 'sandbox/../etc/hosts' collapses to
    'etc/hosts' and is correctly rejected — catching sandbox escapes, not just
    checking a string prefix.
    """
    root_norm = os.path.normpath(root)
    target_norm = os.path.normpath(target)
    return target_norm == root_norm or target_norm.startswith(root_norm + os.sep)


def check_policy_rules(action: dict, policy: Policy) -> Tuple[str, str]:
    """Evaluate one proposed action against the policy. Returns (verdict, reason)."""
    tool = action.get("tool", "")
    target = action.get("target", "")
    records = action.get("records", 0)
    confirmed = action.get("confirmed", False)
    is_filesystem = tool not in policy.paid_api_tools

    # BLOCK: never operate on a filesystem path outside the sandbox.
    if is_filesystem and target and not _within_sandbox(target, policy.sandbox_root):
        return "block", f"path '{target}' is outside the sandbox"

    # BLOCK: never modify more than the allowed number of records in one action.
    if records > policy.max_records:
        return "block", f"modifies {records} records (limit {policy.max_records})"

    # PAUSE: inherently destructive tools always need a human.
    if tool in policy.destructive_tools:
        return "pause", f"'{tool}' is destructive and needs human review"

    # PAUSE / ALLOW: paid-API tools require explicit confirmation.
    if tool in policy.paid_api_tools:
        if confirmed:
            return "allow", f"'{tool}' paid call carries explicit confirmation"
        return "pause", f"'{tool}' calls a paid API without confirmation"

    # ALLOW: read-only safe operations.
    if tool in policy.safe_tools:
        return "allow", f"'{tool}' is a read-only safe operation"

    # ALLOW: recognized write operations, already verified inside the sandbox.
    if tool in policy.write_tools:
        return "allow", f"'{tool}' writes inside the sandbox"

    # AMBIGUOUS: no hard rule classifies this action — Stage 2 (LLM judge) decides.
    return "ambiguous", f"'{tool}' matches no hard rule"
