# 0.7.4 release design

## Version and channel

| Item | Value |
| --- | --- |
| Version | `0.7.4` |
| npm dist-tag | `latest` |
| Tag | `v0.7.4` (annotated) |
| Publish path | GitHub `publish.yml` via `workflow_dispatch --ref v0.7.4` |
| Registry of record | `https://registry.npmjs.org/` |

GitLab remains the documented primary upstream, but the repository path is not available from this machine. GitHub is the working mirror and its publish workflow is explicitly the manual escape hatch; it runs the same gate order (`check-versions --require-tag` → typecheck → build → test → packed check → publish plan → publish → verify-npm).

## Manifest

`packages/cli/src/migrations/manifests/0.7.4.json`:

- `version: "0.7.4"`, `breaking: false`, `recommendMigrate: false`, `migrations: []`.
- Description names user-level Rules injection.
- Changelog: `load: always` inline behavior, `load: index` path-only behavior, shared parser across SessionStart/sub-agent hooks, and the user-level-only boundary.
- Notes: only Rules support `~/.memerig/rules/`; `init`/`update`/`uninstall` never write there; user rules stay out of task manifests.

## Commit and push shape

Because the worktree is shared and dirty, release bookkeeping is a selective commit:

1. Add the manifest.
2. Run `bump-versions.js patch` (writes both package.json files only).
3. Commit only `packages/cli/src/migrations/manifests/0.7.4.json`, `packages/cli/package.json`, `packages/core/package.json` with `chore(release): 0.7.4`.
4. Create annotated tag `v0.7.4` on that commit.
5. Push `main` and the tag to `origin`.

No `release.js`: its pre-release `git add -A -- ':!.memerig'` would sweep unrelated tracked changes.

## Pre-publish verification

- `node packages/cli/scripts/release-preflight.js check-versions`
- `node packages/cli/scripts/check-manifest-continuity.js` with `npm_config_registry=https://registry.npmjs.org/`
- `pnpm build`
- `node packages/cli/scripts/release-preflight.js verify-packed-cli`
- `node packages/cli/scripts/release-preflight.js publish-plan` (both `true`)

## Recovery

- CI fails before publish: fix the cause, keep the same version, re-dispatch the workflow.
- One package published: do not publish locally; re-run the idempotent workflow; `publish-plan` skips the already-published package.
- Tag/version already published before starting: stop and choose a new patch version.
- Never move or overwrite a published tag/version without explicit authorization.
