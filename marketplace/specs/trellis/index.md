# Trellis Project Spec

Use this preset to keep project conventions organized by the layer a change touches. This
entry point routes work; add only the layer files the repository actually needs.

## 1. Route the change by layer

- Read `frontend/` for UI, presentation, client state, styling, and browser constraints.
- Read `backend/` for services, persistence, jobs, error handling, and external APIs.
- Read `shared/` for types, schemas, serialization, and contracts used by more than one
  layer.

If a layer directory does not exist, do not invent a boundary the repository does not
have. Record the real layout here and add `frontend/`, `backend/`, or `shared/` spec
files only when the code has that separation. Every rule must describe directories,
commands, and constraints that actually exist, with examples from this codebase.

## 2. Define contracts at boundaries

Before changing a boundary, trace the data path from input to persistence or
presentation. At each boundary, state:

- the input and output shape, including optional or unknown fields;
- error behavior and who retries, reports, or degrades;
- the validation and serialization owner;
- compatibility or migration expectations for stored or transferred data.

Keep serialization and validation with the layer that owns the contract; callers should
not re-infer payload fields. If two callers need the same shape, add a shared type or
validator at the owner instead of duplicating casts and checks.

## 3. Reuse before adding

Before writing new logic, search existing implementations, callers, and tests. Reuse or
extend an existing helper when its contract matches; do not fork it by copy. If a new
convention is genuinely needed, add it to the relevant layer spec in the same change so
the next task can find it.

## 4. Verify at the closest real seam

Exercise the change through the nearest real caller or entry point, not only through
unit-level mocks:

- normal data, including a round trip across the boundary;
- invalid, empty, or error input and the resulting behavior;
- reload, re-render, or retry behavior when the boundary persists state.

Record the command and result in the task. If a seam cannot be exercised, record the gap
and the risk instead of implying it was verified.

## 5. Review checklist

- [ ] The changed layer and its spec files are named in the task.
- [ ] Each crossed boundary has input/output, error, and validation ownership documented.
- [ ] The implementation reuses existing helpers or justifies a new one.
- [ ] Verification ran through a real caller, or the unverified seam is disclosed.
- [ ] New reusable conventions were added to the relevant layer spec.
- [ ] No layer-specific rule was copied into a place where it does not apply.

## Source and attribution

This spec paraphrases the layered-spec, cross-layer contract, and reuse guidance in the
[Trellis spec templates at commit
`f089cb3`](https://github.com/mindfold-ai/Trellis/tree/f089cb3286071199e84118dee86b6d76aab032f1/packages/cli/src/templates/markdown/spec)
(AGPL-3.0). It is not a verbatim copy of the upstream template files. MemeRig is a fork of
Trellis under the same license; see the repository `COPYRIGHT` and `LICENSE` files and the
[preset README](./README.md).
