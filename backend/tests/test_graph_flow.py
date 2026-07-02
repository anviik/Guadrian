"""End-to-end graph tests against a real (tmp) sandbox — no LLM, no network.

These prove the architecture's claims: allowed actions execute for real with
snapshots pushed, blocks bounce back without side effects, drift triggers an
on-disk rollback, and a PAUSE can be resumed by explicit human approval.
"""

import pytest

from agents.judge import HeuristicJudge
from agents.worker import ScriptedWorker
from graph.build import build_graph
from graph.state import initial_state
from policy.engine import Policy
from sandbox import Sandbox

POLICY = Policy({
    "sandbox_root": "sandbox/",
    "max_records_per_action": 50,
    "destructive_tools": ["delete_all"],
    "paid_api_tools": ["send_email"],
    "safe_tools": ["read_file", "list_dir"],
    "write_tools": ["write_file", "append_file", "delete_file"],
    "on_ambiguous": "pause",
})

WRITE_V1 = {"tool": "write_file", "target": "sandbox/notes/plan.txt", "content": "v1\n"}
APPEND_V2 = {"tool": "append_file", "target": "sandbox/notes/plan.txt", "content": "v2\n"}


def run(tmp_path, script, judge=None, state=None):
    sandbox = Sandbox(base_dir=tmp_path)
    app = build_graph(worker=ScriptedWorker(script), policy=POLICY, sandbox=sandbox, judge=judge)
    final = app.invoke(state or initial_state("Tidy the sandbox notes."))
    return final, sandbox


def test_allowed_actions_really_execute(tmp_path):
    final, box = run(tmp_path, [WRITE_V1, APPEND_V2])
    assert (box.root_path / "notes/plan.txt").read_text() == "v1\nv2\n"
    assert len(final["rollback_stack"]) == 2  # one snapshot per mutating action


def test_blocked_escape_has_no_side_effects(tmp_path):
    final, box = run(tmp_path, [{"tool": "delete_file", "target": "sandbox/../etc/hosts"}])
    entry = final["action_log"][0]
    assert entry["verdict"] == "block"
    assert "result" not in entry  # never reached execute


def test_drift_triggers_real_rollback_on_disk(tmp_path):
    script = [WRITE_V1, APPEND_V2,
              {"tool": "sync_to_cloud", "target": "sandbox/notes/plan.txt"}]
    final, box = run(tmp_path, script, judge=HeuristicJudge())
    # The judge flagged drift; the append (last executed change) was undone on disk.
    assert (box.root_path / "notes/plan.txt").read_text() == "v1\n"
    assert final["last_restored"] == "sandbox/notes/plan.txt"
    assert len(final["rollback_stack"]) == 1  # v2's snapshot popped, v1's remains


def test_pause_halts_and_human_approval_resumes(tmp_path):
    email = {"tool": "send_email", "target": "a@b.com", "content": "done"}
    final, box = run(tmp_path, [email], judge=HeuristicJudge())
    assert final["guardian_verdict"] == "pause"
    assert "result" not in final["action_log"][-1]  # nothing executed

    # Human approves: resume the run with the exact action marked approved.
    resume = {**final, "resume_action": {**email, "human_approved": True}}
    final2, _ = run(tmp_path, [], judge=HeuristicJudge(), state=resume)
    approved = final2["action_log"][-1]
    assert approved["verdict"] == "allow"
    assert "approved by a human" in approved["reason"]
    outbox = list((box.root_path / "outbox").iterdir())
    assert len(outbox) == 1  # the mock email exists on disk now


def test_approval_cannot_waive_the_sandbox_boundary(tmp_path):
    # Even a human-approved action must not escape the sandbox.
    evil = {"tool": "delete_file", "target": "sandbox/../etc/hosts", "human_approved": True}
    state = initial_state("Tidy the sandbox notes.")
    state["resume_action"] = evil
    final, _ = run(tmp_path, [], state=state)
    assert final["action_log"][0]["verdict"] == "block"
