# policy/ — Stage 1 of the guardian (working, Step 2)

The deterministic rule layer the guardian checks before ever invoking the LLM judge.

- `policy.yaml` — the hard constraints, human-readable and version-controllable:
  sandbox root, max records per action, destructive / paid-API / safe / write tool
  classes, and the `on_ambiguous` fail-safe verdict. Editing this file changes
  guardian behavior with zero code changes.
- `engine.py` — `load_policy()` parses the YAML; `check_policy_rules(action, policy)`
  returns `(verdict, reason)` where verdict is `allow` / `block` / `pause` /
  `ambiguous`. Sandbox containment uses normpath resolution, so traversal attempts
  like `sandbox/../etc/hosts` are blocked.

`ambiguous` means no hard rule applies — in Step 3 those actions go to the LLM judge
for drift detection; until then the guardian falls back to the policy's
`on_ambiguous` verdict (`pause`), so nothing unclassified slips through silently.

Unit tests live in `backend/tests/test_policy.py`.
