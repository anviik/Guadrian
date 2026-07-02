"""Unit tests for the Stage 1 policy engine.

These cover every verdict path deterministically, independent of the terminal demo
(which can only show one terminating verdict per run). Run from the backend/ dir:

    pytest -q

A rule engine's value is that it is auditable and testable — this file is that proof.
"""

from policy.engine import Policy, check_policy_rules, load_policy

# A small, explicit policy so tests don't depend on edits to policy.yaml.
POLICY = Policy({
    "sandbox_root": "sandbox/",
    "max_records_per_action": 50,
    "destructive_tools": ["delete_all", "drop_table"],
    "paid_api_tools": ["send_email", "charge_card"],
    "safe_tools": ["read_file", "list_dir"],
    "write_tools": ["write_file", "append_file", "delete_file"],
    "on_ambiguous": "pause",
})


def verdict(action: dict) -> str:
    return check_policy_rules(action, POLICY)[0]


# --- ALLOW -----------------------------------------------------------------

def test_write_inside_sandbox_is_allowed():
    assert verdict({"tool": "write_file", "target": "sandbox/notes/a.txt"}) == "allow"


def test_read_only_safe_tool_is_allowed():
    assert verdict({"tool": "read_file", "target": "sandbox/notes/a.txt"}) == "allow"


def test_confirmed_paid_api_is_allowed():
    assert verdict({"tool": "send_email", "target": "user@example.com", "confirmed": True}) == "allow"


# --- BLOCK -----------------------------------------------------------------

def test_path_outside_sandbox_is_blocked():
    assert verdict({"tool": "delete_file", "target": "/etc/hosts"}) == "block"


def test_sandbox_escape_via_traversal_is_blocked():
    # 'sandbox/../etc/hosts' normalizes to 'etc/hosts' — a string prefix check would
    # miss this; the engine must catch it.
    assert verdict({"tool": "delete_file", "target": "sandbox/../etc/hosts"}) == "block"


def test_over_record_limit_is_blocked():
    assert verdict({"tool": "write_file", "target": "sandbox/db", "records": 9999}) == "block"


# --- PAUSE -----------------------------------------------------------------

def test_destructive_tool_is_paused():
    assert verdict({"tool": "delete_all", "target": "sandbox/"}) == "pause"


def test_unconfirmed_paid_api_is_paused():
    assert verdict({"tool": "send_email", "target": "user@example.com"}) == "pause"


# --- AMBIGUOUS -------------------------------------------------------------

def test_unknown_tool_inside_sandbox_is_ambiguous():
    assert verdict({"tool": "sync_to_cloud", "target": "sandbox/notes/"}) == "ambiguous"


# --- precedence / ordering -------------------------------------------------

def test_outside_sandbox_beats_destructive():
    # A destructive tool aimed outside the sandbox is a hard block, not a pause.
    assert verdict({"tool": "delete_all", "target": "/important"}) == "block"


# --- human approval ----------------------------------------------------------

def test_human_approved_action_is_allowed():
    # An action a human explicitly approved after a PAUSE goes through.
    assert verdict({"tool": "send_email", "target": "a@b.com", "human_approved": True}) == "allow"


def test_human_approval_cannot_waive_sandbox_boundary():
    # The sandbox rule outranks approval — nobody can waive it.
    assert verdict({"tool": "delete_file", "target": "/etc/hosts", "human_approved": True}) == "block"


# --- policy.yaml loads and parses ------------------------------------------

def test_shipped_policy_file_loads():
    p = load_policy()
    assert p.sandbox_root == "sandbox/"
    assert "delete_all" in p.destructive_tools
    assert p.on_ambiguous == "pause"
