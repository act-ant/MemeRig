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
- The built-in presets use the exact Marketplace file content. The default guidance template generates no project conventions or project vision: its Spec README adopts the standalone `.memerig/attractor-guide.md` method. Default behavioral declarations remain separate in `.memerig/rules/index.md` and `core.md`. Explicitly configured platforms can provide hooks. Onboarding task generation requires its own flag.
- An explicit remote template or registry error exits nonzero. Fresh init stages the download outside the checkout, so a failed fetch leaves no project files. `--template blank` explicitly selects default guidance without a preset or registry lookup, including in a blank monorepo.

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
- User-level rules live outside the repository in `~/.memerig/rules/*.md`.
  Only Rules have this user-global source; init, update, and uninstall never
  create, hash, overwrite, or delete those files.
- `session_context.get_user_rules_text` reads flat frontmatter `load`:
  `load: always` inlines the body into SessionStart context; missing,
  `load: index`, or unknown values produce a path-only index entry. User rules
  are peers of project rules and never enter `implement.jsonl` / `check.jsonl`.
  The shared SessionStart and class-1 sub-agent hooks reuse this block, so
  delegated prompts see the same `always` bodies and index paths.
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
| User rule with `load: always` | Body injected into SessionStart; no repository file written |
| User rule with `load: index` | Path listed for on-demand reading; body not injected |

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

## 9. Optional repository-attractor guidance

### Scope / Trigger

Applies to default setup, bundled guidance, shared workflow entry points, and
init/update ownership. This is a Markdown practice, not a new parser, task state,
configuration flag, or capability registry.

### Signatures

- `memerig init --template blank` selects the default guidance template offline.
- `attractorGuideTemplate` in `templates/memerig/index.ts` supplies the standalone
  guide to `createWorkflowStructure` and `collectTemplateFiles`.
- `initializeHashes(cwd, { trackedPaths, merge })` uses actual write receipts for
  managed files, including `.memerig/` assets. A skipped file retains its earlier
  receipt. The no-receipts API retains directory-based initialization.
- Relevant direction uses existing `task.py add-context` manifests; no automatic
  filename-based injection is added.

### Contracts

- Canonical assets live under `packages/templates/assets/`. The managed guide is
  installed at `.memerig/attractor-guide.md`, independently of Spec/workflow
  selection. The bundled `attractor` skill owns its frontmatter and is discovered
  through the existing shared platform template map.
- The `attractor` skill itself defines the concept and distinguishes durable
  intent, implementation progress, divergence, and task-local exceptions. It
  must remain understandable without loading the optional detailed guide;
  selecting and following a project method still uses the adoption rules below.
- Only the default Spec README adopts the default method automatically. Other
  templates own their adoption, method, documents, and timing; silence means no
  attractor procedure. Shared routes read existing root Spec entries and actual
  relevant adopted bodies. Installed resources and leftover files are not adoption.
- Meaningful direction is user-owned `.memerig/spec/attractor.md`. Installation
  never fabricates it. Confirmed user intent, AI proposals, and open questions
  remain distinct. Deferral does not block ordinary work or create tasks.
- Current code contracts remain separate from desired future properties. Neither
  permits unrelated rewrites. Explicit custom-method conflicts require a scoped
  decision; a broken custom guide never selects the default implicitly.
- Main and delegated contexts load applicable actual bodies. An index link alone
  does not load them. Non-adoption introduces no interview, reminder, missing-file
  warning, context injection, or completion gate.
- Re-init and conflict-safe update preserve authored direction and custom entry
  documents. Remote append records only newly downloaded Spec paths, never local
  files that the download skipped. Explicit remote `--overwrite` retains its
  existing whole-directory replacement semantics; use append to retain local Spec
  content. This feature does not introduce another overwrite policy.

### Validation and error matrix

| Scenario | Result |
| --- | --- |
| Default setup without platform, identity, or onboarding | README reaches standalone guide; no fabricated attractor or task |
| Blank monorepo | Default root README; no per-package placeholder conventions |
| Selected preset or silent template | Preserve its entries and objectives; no inherited default adoption |
| Custom method or explicit non-adoption | Follow selected instructions; do not run a second default interview |
| Modified guide/workflow followed by skip-existing re-init | Preserve bytes and prior receipts; later update must see the conflict |
| Remote append followed by update | Local direction remains user-owned; downloaded pristine conventions can update |
| Existing attractor omitted from task manifests | Its body is not automatically injected |

### Good / Base / Bad cases

Good: record a user's explicit long-term UI preference, then curate the actual
body for a relevant design task. Base: defer construction and continue approved
work. Bad: interpret an installed skill or old file as mandatory adoption, or
re-hash skipped user content as a pristine upstream template.

### Tests required

Exercise real default CLI init and a pristine update dry-run; verify packaged
guide/skill/reference assets and platform parity. Use init/update integration
tests for remote append, skipped-file receipts, and `.new` conflict review.
Run actual SessionStart and implement/check hooks for selected-body loading and
non-injection. Evaluate conversational guidance separately; toolless model replies
are evidence of conversational choices, not proof of saved files or autonomous
workflow execution.

### Wrong versus correct

Wrong: recursively hash `.memerig/` after a skip-existing init or all Spec files
after a remote append. This turns user edits into supposedly pristine templates.
Correct: use recorded managed writes; retain previous receipts for skipped files;
only claim new Spec paths added by an append download.


