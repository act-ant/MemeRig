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
- The built-in presets use the exact Marketplace file content. Init without a template generates no spec. Explicitly configured platforms can provide hooks. Onboarding task generation requires its own flag.
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
