# sandbox/ — the reversible target environment (working, Step 4)

`fs.py` holds the `Sandbox` class: real filesystem operations under one sandbox
root, plus the rollback primitives — `capture_state(target)` snapshots a file
before an allowed action runs; `restore_state(snapshot)` undoes it byte-for-byte
(including re-deleting files an action created).

External-effect tools (`send_email`, anything unrecognized) are mocked as records
written to `sandbox/outbox/`, keeping every effect file-backed and therefore
genuinely reversible — the honest scope of this build.

Containment is defense-in-depth: the guardian blocks escapes before execution, and
`Sandbox._resolve()` independently refuses paths outside the root, raising
`SandboxViolation` if the guardian was somehow bypassed.
