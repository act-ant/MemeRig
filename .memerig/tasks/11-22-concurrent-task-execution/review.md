# Managed parallel task execution review

## Acceptance evidence

- Windows and Linux temporary repositories passed concurrent execution of distinct tasks, exclusive claims for the same task, and edits to the same relative path in separate worktrees.
- Killing the launcher and simulating lease expiration produced one interrupted receipt. Repeating recovery preserved the receipt. Recovery also reconciled the persisted boundaries after receipt write and after task-state update.
- A real Codex CLI 0.167.1 managed run discovered the checked-in project hooks and persisted native implementation and subagent session IDs and a turn-end event. The isolated invocation used `--no-daemon`, an explicit `projects` trust table and invocation-local hook trust for the vetted test fixture. No global trust settings were modified.
- A Draft 2020-12 validator accepted all three exported schemas and the corresponding persisted Git delivery receipts. Invalid versions were rejected. Runtime also checks ownership and receipt filename.
- Git delivery refused unmerged commits and an approval missing a newly required check. It accepted the updated approval and verified equivalent squash delivery. Repository documents and a published file outside the repository passed delivery. Altered external bytes were rejected.

## Operational boundaries

External document verification checks the supplied file against the reviewed Git blob. The publication reference is supplied by the caller. Project hooks require Codex project trust and hook approval in normal use. Cross-machine scheduling and Vercel Board integration remain outside this local plan.

## Code commits

`0f0a0d307f`, `9fd720ea81`, `f1e0678029`, `190d75e7a2`, `c0609628a0`.
