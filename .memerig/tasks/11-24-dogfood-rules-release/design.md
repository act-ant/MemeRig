# Default Rules self-adoption and stable release

## Scope

Adopt the existing bundled `index.md` and `core.md` into `.memerig/rules/` without changing their contents. Add narrowly scoped Rules routing to the existing repository AGENTS/CLAUDE instructions and workflow context-curation section. Leave optional catalog documents unadopted.

## Release boundary

Prepare stable `0.7.3` on `main`, keeping CLI/core versions aligned and source dependency `workspace:*`. Add a non-breaking manifest with no rename/delete migrations. Include the already committed declarative Rules feature in the release notes.

Official publication remains GitHub Actions-only. `origin` is `git@github.com:act-ant/MemeRig.git`; `gh` commands must use `--repo act-ant/MemeRig` because implicit repository resolution points at upstream Trellis.

## Shared-worktree safety

Do not run the release orchestrator's blanket staging/commit operations or a broad self-update. Use the selective commit namespace for task-owned changes, retaining unrelated staged and unstaged work. Push `main` and only `v0.7.3`, not all local tags. Do not replace an existing tag or overwrite a published version.

## Verification and recovery

Verify canonical/default document parity, task-context validation, release version/manifests, packed exact core dependency, packaged Rules, and fresh built-CLI init/update behavior. Run the repository release gates and inspect the official publish job before claiming publication. Confirm both packages and `latest` on the public npm registry.

If publication is partial, inspect and rerun the idempotent CI workflow; never fill a missing package with local npm publication. A pre-existing published tag/version is a conflict to resolve before pushing, not permission to overwrite it.
