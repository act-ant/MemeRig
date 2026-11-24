# Repository-local setup and project discovery

## 1. Scope

The project scripts are available after cloning. Init prepares project-owned files and optional platform integration. Project discovery identifies checkouts owned by the current user without importing their content.

## 2. Signatures

```text
memerig init [--template <id>] [--tasks local|tracked] [--with-onboarding] [platform flags]
python .memerig/scripts/project.py doctor [path]
python .memerig/scripts/project.py configure [--tasks local|tracked]
python .memerig/scripts/project.py register [path]
python .memerig/scripts/project.py unregister [checkout-path]
python .memerig/scripts/project.py list
memerig mem projects --registered [--json]
```

## 3. Contracts

- New config receives a stable `project_id` UUID and `tasks.version_control: local` by default. Local task tracking uses a managed `/tasks/` block in `.memerig/.gitignore`. Changing it never edits the Git index.
- The nearest `.memerig/config.yaml` inside a Git boundary owns tasks by default. `task_owner: parent` selects the enclosing project explicitly. Project diagnostics return `projectId`, `config`, `ownerConfig`, `taskStore`, and `taskVersionControl`.
- Registered checkout paths and a local user UUID live in `~/.memerig/projects.json`. The persisted shape is `{schemaVersion: 1, userId, projects: { [projectId]: string[] }}`. `list` also reports `stale` paths. Discovery reads never create the file.
- The built-in presets use the exact Marketplace file content. Init without a template generates no project conventions (only the spec layout README). Default behavioral declarations are separate: `.memerig/rules/index.md` and `core.md`. Explicitly configured platforms can provide hooks. Onboarding task generation requires its own flag.
- An explicit remote template or registry error exits nonzero. Fresh init stages the download outside the checkout, so a failed fetch leaves no project files. Use `--template blank` to explicitly select the empty preset.

## 4. Validation and errors

| Situation | Result |
| --- | --- |
| Local-only mode contains tracked tasks | List tracked files and keep existing index entries |
| Inherited module has no parent project | Return a configuration error |
| No local catalog | Return an empty registry without writing user state |
| Registered checkout has moved or changed project IDs | Report it as stale and exclude it from memory grouping |
| Existing file conflicts with a built-in preset | Keep existing content. `--overwrite` writes a `.new` review copy |
| Unknown explicit template or interrupted fresh download | Nonzero exit. The checkout remains uninitialized. |

## 5. Example cases

A team commits initialized configuration and a tracked task directory. Its collaborators run the repository scripts directly. A maintainer registers two clones of that team project and sees one project ID. A separately initialized submodule gets its own store.

## 6. Verification

Use the init integration tests to exercise a network-free blank initialization and compare all three built-in presets to Marketplace. Use the memory integration test to verify that two checkouts produce one registered project and stale checkouts are excluded. Test Git tracking and parent ownership from separate temporary checkout roots.

## 7. Ownership example

An independent checkout retains its own `project_id` in its config. A child module sharing tasks sets `task_owner: parent` and uses the parent's ID. Never copy a user catalog, its IDs, or its checkout paths into the repository.

## 8. Declarative Rules

### Scope

Rules are behavioral declarations under `.memerig/rules/`, alongside project
contracts under `.memerig/spec/`. Neither directory establishes an automatic
priority over the other. This is not a separate policy engine or CLI resource.

### Signatures

- `getAllRules(): Map<string, string>` in `templates/memerig/index.ts` supplies
  default rule filenames/content to both `createWorkflowStructure` and
  `collectTemplateFiles`.
- `task.py add-context <task> implement|check .memerig/rules/<file>.md <reason>`
  uses the existing context manifest; there is no Rules install/enable command.

### Contracts

- Canonical default content lives in `packages/templates/assets/memerig/rules/`.
  Install only `index.md` and `core.md`; do not recursively copy the Marketplace catalog.
- Create `.memerig/rules/` with `ensureDir` before the first `writeFile`.
  The shared atomic writer assumes its parent directory exists; an in-memory
  template/build check alone cannot prove fresh initialization succeeds.
- Keep Rules routing in the bundled workflow and
  `marketplace/workflows/native/workflow.md` synchronized. The existing native
  workflow mirror test guards identical behavior across both distribution paths.
- Optional declarations live in `marketplace/rules/`. Adoption is a reviewed copy
  of a selected file plus an index entry with applicability and source revision.
- Main-session instructions route to the index and applicable bodies. Sub-agent
  contexts need actual rule files, not an assumption that Markdown links expand.
- Rules use init write receipts, not the legacy `.memerig/` hash walk.
  Re-init must not rebaseline a skipped modified index/core or claim ownership of
  manually adopted files. A merged receipt retains the previous default hashes.
- Default files use existing update conflicts (`--skip-all` / `.new` review copies);
  `--force` explicitly authorizes replacing edited default files.
  Optional files are not collected as bundled templates.

### Validation matrix

| Scenario | Required result |
| --- | --- |
| Fresh blank init | Default Rules present, only the layout README under Spec |
| Old install without Rules or receipts | Update backfills defaults |
| User edits core/index, then skip-existing re-init | Content and original receipts survive |
| User copies an optional declaration | Not claimed by init's directory hash scan |
| Conflict-safe update | Edited declarations preserved; `.new` contains upstream defaults |
| Unselected catalog document | Not installed or injected |

### Cases

Good: adopt production compatibility for published API changes and include its
body in the relevant task contexts. Base: core only. Bad: copy the whole catalog
into active contexts, or assume an index link injects its target automatically.

### Verification

Use init/update integration tests for default delivery, backfill, and preservation
after re-init. Exercise real context output with an adopted rule body and an
unselected reference rule; only the selected content should reach the task.

### Wrong versus correct

Wrong: recursively hash `.memerig/rules/` after re-init, making local edits look
like pristine upstream content. Correct: hash only rule files actually written
in that run and retain previous receipts for skipped files.

