# Task Protocol v1

> Repository-native task lifecycle used by `.memerig/scripts/task.py`.
> No npm CLI, network call, hook, developer file, or active AI session is
> required to create, resume, update, or complete a task.

---

## 1. Scope / Trigger

Read this when changing `.memerig/scripts/task.py`, `common/task_*.py`,
`common/file_lock.py`, `packages/core/src/task/**`, or any writer/reader of
`.memerig/tasks/**/task.json`.

The Python runtime is the **lifecycle writer**. TypeScript and external
adapters may read records and may create their own records through the same
contract, but they must not implement a second lifecycle state machine.

---

## 2. Files and machine interface

One task is one directory:

```
.memerig/tasks/MM-DD-slug/
├── task.json          # versioned record (schemaVersion: 1)
├── prd.md             # requirements / evidence (unchanged)
├── implement.jsonl    # optional curated context
└── check.jsonl        # optional curated context
```

Legacy closes live at `.memerig/tasks/archive/YYYY-MM/<task>/` and remain
readable. New closes **do not move the directory**.

| Command | Writes | Machine output |
| --- | --- | --- |
| `task.py create "<title>" --description "<text>" --json` | new `task.json` | `{task, path, version}` |
| `task.py start <selector>` | task status and session pointer | human-readable status and session information |
| `task.py list [--json]` | no | `{tasks: [...]}` in JSON mode (active view in both formats) |
| `task.py list --status completed --json` | no | explicit status view (closed matching rows included) |
| `task.py list --closed --json` | no | `{tasks: [...], problems: [...]}` (in-place closed + archive) |
| `task.py show <selector> --json` | no | `{task, location: {dir, archived, archive_month, closed}, version}` |
| `task.py update <selector> [options] --json` | record fields | `{task, location, changed, version}` |
| `task.py complete <selector> --json` | record fields | `{task, location, changed, alreadyCompleted, version}` |
| `task.py migrate --preview [--json]` | no | plan with entries, errors, warnings, summary |
| `task.py migrate --apply [--json]` | all changed records | `{backupPath, changed, unchanged, oldToNew}` |
| `task.py schema` | no | the v1 JSON Schema |

`start`, `show`, `update`, and `complete` accept a UUID, legacy ID, task name,
directory name, or task path. `start` rejects a closed task. `create`,
`start`, `current`, `finish`, and `complete` use the task owner's session
store, including when the invoking module configures `task_owner: parent`.
`rename` changes the task directory and name. A canonical UUID stays the same,
so callers can still resolve the task by its original ID.

`version` is the SHA-256 of the exact `task.json` bytes read from disk. It is
opaque; clients store it and pass it back with `--expect-version`. A mismatch
raises `stale_version` under the writer lock before the file is replaced.

All machine diagnostics are on stderr; stdout carries one JSON object.

---

## 3. Record shape and the compatibility adjustment

All 24 legacy fields remain present so `memerig-core`'s
`MemerigTaskRecord`, `task_queue.py`, session context, hooks, and existing
`task.json` readers keep working. v1 adds:

| Field | Meaning |
| --- | --- |
| `schemaVersion: 1` | record version |
| `updatedAt` | UTC timestamp of the last accepted write |
| `closedAt` | UTC timestamp; required for `completed`/`canceled` |
| `parentId` | canonical parent edge (parent's UUID) |
| `legacyId` | pre-migration id/slug, still resolvable |
| `labels` | unique non-empty strings |
| `nextAction` | short handoff for the next session |
| `extensions` | namespaced adapter metadata (`com.example.board`) |

`meta` is retained verbatim as the legacy free-form bag (including
`linear_issue`). `parent` and `children` are retained as legacy mirrors used
by existing list/tree/session-context readers; new records maintain them in
sync with `parentId`.

### Status vocabulary adjustment

The research proposal used `open | in_progress | done | canceled`. The stored
vocabulary stays `planning | in_progress | review | completed | canceled`
because the per-turn `[workflow-state:STATUS]` breadcrumb and existing
integrations key on `planning` / `in_progress` / `completed`. This is a
deliberate compatibility adjustment, not an alternate schema:

| Input / external name | Stored value |
| --- | --- |
| `open` | `planning` |
| `in_progress` | `in_progress` |
| `review` | `review` |
| `done`, `closed`, `archived` | `completed` |
| `canceled`, `cancelled` | `canceled` |

`completed` and `canceled` are **closed**. `complete` is the only one-operation
close: it writes `status: completed`, `closedAt`, and the legacy
`completedAt`, and clears the owner's session pointers to that task. It
never moves the directory or commits. Replaying it keeps the same record and
version and can clear any leftover matching pointers. `update --status ...`
is the explicit reopen path; reopening clears
`closedAt` and `completedAt`.

`assignee` and `creator` may be empty strings. Empty means “unassigned”; an
ordinary checkout with no `.developer` and no session identity can still
create a task. `--assignee`/`MEMERIG_DEVELOPER` still win when present.

`createdAt` and `updatedAt` are normalized to `YYYY-MM-DDTHH:MM:SSZ`.
Legacy date-only values become midnight UTC during migration. `updatedAt` must
not precede `createdAt`; `closedAt` must not precede `createdAt`.

---

## 4. Concurrency boundary

- One writer lock per store: `.memerig/tasks/.task.lock`.
- `common/file_lock.py` is advisory (`fcntl.flock` on POSIX,
  `msvcrt.locking` on Windows), exclusive, timeout-bounded, and released by
  the OS if a writer dies.
- `create`, `update`, `complete`, and migration apply hold the lock across
  read → compare version → validate → atomic replace.
- `common/io.write_json` / `write_text_atomic` already use a same-directory
  temp file + `os.replace`; the protocol adds the missing
  read-modify-write serialization.
- The version token hashes the bytes **actually on disk** (after text-mode
  newline translation), so it matches a later `show`.
- `complete` ignores the version token only in the already-completed no-op
  case. A transition still refuses a stale token.
- TypeScript migration-task creation uses
  `writeFileAtomicExclusive` (hard-link create), so it cannot clobber a
  record created concurrently by `task.py`.

Two writers with the same original snapshot: the first replaces the file; the
second's version comparison fails with `stale_version` and includes the
current record/version in the error payload. It must re-read and retry.

---

## 5. Migration

`task.py migrate --preview` (default) scans active and archived records and
reports:

- records needing a UUID / `schemaVersion` / timestamps / parent edge;
- `oldId -> newId` for legacy ids;
- dangling parent references (warning; `parent` mirror preserved, `parentId`
  dropped);
- parent cycles, duplicate ids, unrecognized statuses (errors that block
  apply);
- unreadable `task.json` files.

`--apply` re-runs the preview, refuses on any preflight error, verifies every
record still has the preview's bytes, copies the entire tasks tree to
`.memerig/.backup-task-migration-<UTC stamp>/tasks`, writes a `manifest.json`
with the old→new id map inside the same backup, then replaces records
atomically. On a write failure it restores the already-written originals from
memory and reports the backup path. Apply is rerunnable: a second run previews
zero changes and writes nothing.

Migration never deletes `prd.md`, `design.md`, `implement.md`, JSONL manifests,
`meta`, unknown top-level fields, or legacy archive directories.

---

## 6. Closed view and legacy archives

- `list` and `list --json` hide `completed`/`canceled` unless `--status` is
  explicit. The text view still counts closed children in parent progress and
  shows visible children whose parent is filtered out.
- `list --closed` is the separate closed view: in-place `completed`/`canceled`
  records plus every legacy `archive/YYYY-MM/*` directory.
- `show <id>` searches active and archive by UUID, legacy id, directory name,
  or path. Archived records are read-only for `update`/`complete`; move the
  directory back before reopening in place.
- `close` keeps the path stable; only the explicit legacy `archive` command
  moves a directory.

---

## 7. Git collaboration

- Commit `.memerig/tasks/<dir>` (including `task.json`, `prd.md`, JSONL) as
  normal files. `tasks.version_control: local` projects intentionally ignore
  `/tasks/`; that is a project policy, not a protocol change.
- Two clones editing the same record produce a normal Git conflict in
  `task.json`. Resolve by keeping one record, then re-read: the merged file's
  bytes are the new version token, so both sessions must refresh before the
  next write.
- Closing in place means a merged branch keeps the task at the same path.
  `git status` shows a modification, not a rename/delete+add pair.
- The migration backup `.memerig/.backup-task-migration-*` is ignored by the
  safe-commit ignore rules and should not be committed.
- Legacy archive moves still use `git mv` semantics through `task.py archive`
  and its safe commit path.

---

## 8. Integration contract

- Adding a `task.json.status` writer requires updating
  [workflow-state-contract.md](./workflow-state-contract.md). v1 adds
  `task.py update` (explicit transitions) and `task.py complete` (in-place
  `completed`). Normal `complete` clears the active pointer. An explicit
  status update can leave it available to the `completed` breadcrumb.
- `common/tasks.py:load_task` normalizes `open`/`done` aliases **in memory**;
  reads never rewrite records.
- `packages/core/src/task/protocol.ts` mirrors the status normalization and
  validation for Node consumers. `MemerigTaskRecord` gains optional v1 fields;
  the canonical 24-field order and factory are unchanged.
- External boards use `extensions` for their own ids and call `show`/`update`
  with the version token. They do not need a local service.

---

## 9. Verification

```bash
python3 .memerig/scripts/task.py schema
python3 .memerig/scripts/task.py migrate --preview
python3 .memerig/scripts/task.py create "Smoke" --description "protocol" --slug smoke --no-start --json
python3 .memerig/scripts/task.py show <id> --json
python3 .memerig/scripts/task.py start <id>
python3 .memerig/scripts/task.py update <id> --next-action "resume here" --json
python3 .memerig/scripts/task.py complete <id> --json
python3 .memerig/scripts/task.py complete <id> --json   # same version, same path
python3 .memerig/scripts/task.py list --closed --json
diff -rq .memerig/scripts packages/cli/src/templates/memerig/scripts -x __pycache__
```

---

## 10. Wrong vs correct

### Wrong — clobber a record from a stale snapshot

```bash
python3 task.py show demo --json          # version=V1
# another session updates the same task
python3 task.py update demo --next-action "x"   # no token: last writer wins
```

### Correct — supply the snapshot token

```bash
V=$(python3 task.py show demo --json | jq -r .version)
python3 task.py update demo --next-action "x" --expect-version "$V" --json
# stale_version -> re-read, merge, retry
```

### Wrong — move or rename on close

```bash
mv .memerig/tasks/11-19-demo .memerig/tasks/archive/2026-11/11-19-demo
```

### Correct — close in place

```bash
python3 task.py complete demo --json
```

Use `task.py archive demo` only when the project intentionally wants the
legacy archive layout.

## 11. Managed local execution

Use the following commands from the task owner's checkout. The execution command must leave a clean worktree containing a delivery commit.

```sh
python .memerig/scripts/task.py execution run <task-id> -- <agent-command> [args]
python .memerig/scripts/task.py execution review <task-id> <run-id> --decision approved --reviewer <actor> --check tests=passed --evidence <reference>
python .memerig/scripts/task.py execution deliver <task-id>
python .memerig/scripts/task.py execution recover <task-id>
```

Run uses the store lock to serialize claims, renews the claim while a subprocess runs, and writes a versioned receipt under `runs/` before changing the task state. A successful run becomes the candidate for review. Recover reconciles a persisted receipt or records an expired run as interrupted. It refuses to displace an active claim.

Host hooks may call `task.py execution session <provider> <ref> --role implementation|subagent` with the inherited `MEMERIG_TASK_OWNER`, `MEMERIG_TASK_ID`, and `MEMERIG_RUN_ID`. Registration requires the same Git repository and a live claim. The default runtime binding uses the run UUID as its context key. Review requires named passing checks and any checks declared in the comma-separated task metadata key `requiredChecks`.

Deliver verifies the approved commit is reachable from the local target branch before writing a delivery receipt and closing the task in place. Direct `complete` and status updates reject managed tasks. Preserve failed worktrees and worktrees that Git cannot safely remove. To verify the contract, exercise competing claims in separate processes, review with a missing required check, and delivery before and after the approved commit reaches the target branch.

`task.py execution schema runs|reviews|deliveries` exports the versioned JSON Schema for each receipt kind. Runtime validation additionally checks ownership and the receipt filename. `task.py execution evidence check|artifact|progress <value>` records evidence under the active lease and carries it into the terminal receipt. Codex registers startup, supported subagent startup, and turn-end events through its configured hooks. Turn-end records are progress only. For a rewritten delivery, `execution deliver <task-id> --landed-commit <sha>` verifies the landed commit is on the target branch and preserves the reviewed file changes.

For a document delivered outside Git, register the repository-relative source with `execution evidence artifact <path>` and review the commit containing it. Run `execution deliver <task-id> --artifact-path <path> --artifact-file <published-file> --artifact-ref <stable-reference>` to compare the published file's bytes with the reviewed Git blob. The receipt records the stable reference and blob ID. The caller supplies the published file and reference.
