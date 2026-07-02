"""Tests for the sandbox filesystem: real writes, snapshot/restore, containment."""

import pytest

from sandbox import Sandbox, SandboxViolation


@pytest.fixture
def box(tmp_path):
    return Sandbox(base_dir=tmp_path)


def test_write_then_read_roundtrip(box):
    box.run_action({"tool": "write_file", "target": "sandbox/a.txt", "content": "v1"})
    assert box.run_action({"tool": "read_file", "target": "sandbox/a.txt"}) == "v1"


def test_snapshot_restores_previous_content(box):
    box.run_action({"tool": "write_file", "target": "sandbox/a.txt", "content": "v1"})
    snap = box.capture_state("sandbox/a.txt")
    box.run_action({"tool": "append_file", "target": "sandbox/a.txt", "content": "v2"})
    box.restore_state(snap)
    assert box.run_action({"tool": "read_file", "target": "sandbox/a.txt"}) == "v1"


def test_restore_deletes_file_the_action_created(box):
    snap = box.capture_state("sandbox/new.txt")  # did not exist
    box.run_action({"tool": "write_file", "target": "sandbox/new.txt", "content": "x"})
    box.restore_state(snap)
    assert "does not exist" in box.run_action({"tool": "read_file", "target": "sandbox/new.txt"})


def test_containment_raises_on_escape(box):
    with pytest.raises(SandboxViolation):
        box.run_action({"tool": "write_file", "target": "sandbox/../evil.txt", "content": "x"})
    assert not (box.base / "evil.txt").exists()


def test_unknown_tool_is_mocked_to_outbox(box):
    effect = box.effect_target({"tool": "send_email", "target": "a@b.com"})
    assert effect.startswith("sandbox/outbox/send_email")
    result = box.run_action({"tool": "send_email", "target": "a@b.com", "content": "hi"}, effect)
    assert "mock" in result
    assert (box.root_path / "outbox").is_dir()


def test_read_tools_are_not_mutating(box):
    assert not box.is_mutating("read_file")
    assert not box.is_mutating("list_dir")
    assert box.is_mutating("write_file")
    assert box.is_mutating("send_email")
