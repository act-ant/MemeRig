# Design

## Files and public contract

Keep UTF-8 `task.json` and `prd.md` together under `.memerig/tasks/`. Use an immutable UUID v4 for new task IDs and a stable directory per record. Keep existing directory names on migration. `parentId` is the stored hierarchy edge, and child views derive from it. The [schema draft](research/task-v1.schema.json) defines required fields, optional handoff data, and namespaced extension objects. Runtime validation additionally checks timestamp ordering, task identity, legal transitions, and parent references. Keep platform-local session pointers outside task records.

`open` and `in_progress` are resumable. `done` and `canceled` require `closedAt` and appear in the closed view. `complete <id>` performs the transition and can be replayed without moving files or rewriting timestamps. Reopening is an explicit transition through `update` and clears `closedAt`. A user closing an AI window leaves the last saved state. `nextAction` records a short handoff while `prd.md` holds narrative and evidence.

## Entry point and concurrency

`.memerig/scripts/task.py` exposes `create`, `list`, `show`, `update`, and `complete`. It provides a documented JSON mode and structured errors for clients. Treat the version token returned with a task as an opaque digest of the task record bytes. Compare it under the writer lock before replacing the file atomically. Two independent clones reconcile with regular Git merge review. External adapters read and write via this contract. Their namespaced metadata can hold external record IDs. Python owns lifecycle writes. TypeScript consumers follow the same schema and contract fixtures.

## Migration

Use a preview plus explicit apply. Preserve document paths, task IDs that already meet the schema, and an old-to-new map for legacy IDs. Resolve parent links in a second pass. Map planning to open and completed to done, preserve legacy review intent as metadata on in-progress records, and fail on unrecognized states until mapped. Preserve existing archives at their paths and treat closed status as the archive view. Back up the pre-migration state and switch all first-party writers and readers together. Existing customized project files follow the update ownership process.
