# Implementation: GitLab upstream for MemeRig

## Change boundary

Behavior gap: the release gate and publish pipeline existed only as GitHub
Actions, and `release-preflight` only understood GitHub's tag env and
`$GITHUB_OUTPUT`. A tag pushed to a GitLab primary would run no gate at all and
`check-versions --require-tag` would refuse it.

## Landed

| File | Change |
| --- | --- |
| `packages/cli/scripts/release-preflight.js` | `tagVersionFromEnv()` also reads `CI_COMMIT_TAG`; plan `key=value` lines extracted to `planEnvLines()` and shared by `--github` and the new `publish-plan --dotenv <file>`; missing-tag error names both hosts. |
| `.gitlab-ci.yml` | New: `python-3.9-syntax` + `test` (typecheck, `lint:py`, lint, build, test, dist check) on branch/MR pipelines; `publish` on `v*` tags with `resource_group`, plan → conditional publish per package → `verify-npm`, `NPM_CONFIG_PROVENANCE=false`, dotenv artifact. |
| `packages/cli/test/scripts/release-preflight.integration.test.ts` | New: GitHub tag, GitLab tag, branch pipeline, mismatched tag — all through the real CLI. |
| `README.md` | "CI and releases": topology table, GitLab project prerequisites, release command. |

Explicitly not changed: `.github/workflows/*` (still the mirror path),
`release.js` (already pushes `origin`, which becomes GitLab), package versions,
`.npmrc`.

## Verification run

- `npx vitest run test/scripts/release-preflight.integration.test.ts` → 4/4 pass.
- `npx eslint test/scripts/release-preflight.integration.test.ts` → clean.
- `npx tsc --noEmit` (packages/cli) → clean.
- `CI_COMMIT_TAG=v0.7.3 node scripts/release-preflight.js check-versions --require-tag` → ok.
- `node scripts/release-preflight.js publish-plan --dotenv <file>` → plan says
  `skip (already on npm)` for both 0.7.3 packages; sourced file yields
  `tag=latest core=false cli=false`.
- `python -c "yaml.safe_load(...)"` on `.gitlab-ci.yml` → parses; stages and
  jobs as intended. `glab ci lint` was not available (platgit unreachable).

## Cutover (done)

Network note: platgit was only unreachable because `HTTPS_PROXY` pointed at a
local proxy; SSH was fine and API calls succeed with the proxy bypassed
(`NO_PROXY=platgit.mihoyo.com`, or a per-request no-proxy opener). `glab` still
reports `Unauthenticated` on that setup, so the API calls below used the stored
token directly.

- Project created: `exp/kl/aift/memerig` (id 34193, private), default branch
  `main`.
- Remotes: `origin` → `git@platgit.mihoyo.com:exp/kl/aift/memerig.git`;
  the old GitHub origin is now `github`; `upstream` (Trellis) unchanged.
  The working copy was a shallow clone — `git fetch --unshallow github`
  (36 → 1403 commits) was required, GitLab rejects shallow pushes.
- Protected tag `v*` created (creation level: Maintainers).
- Runners are picked by tag only, so `default.tags: [plat-ci]` was added;
  without it both jobs sat `pending` with no runner.

Two defects surfaced by the first real pipelines, both fixed:

1. `jobs:publish:script` was rejected by GitLab lint — `echo "plan: ..."` parsed
   as a mapping (colon+space in a plain scalar). Quoted the line.
2. `pnpm --filter memerig lint:py` failed with 8 basedpyright errors that had
   gone unnoticed because GitHub CI had not run since the change
   (`properties` inferred as `dict[str, dict[str, str]]` receiving an int const
   and enum lists; an unused `location` binding in `record_session`).

Verified: `python-3.9-syntax` green on `plat-runner034`; `lint:py` 0 errors
locally; `test/regression.test.ts` 496 passed / 13 skipped.

Remaining: the `NPM_TOKEN` CI/CD variable (masked + protected) is **not set** —
the local `~/.npmrc` token for registry.npmjs.org returns 401, so the value has
to come from whoever owns the npm account. Until it exists, a tag pipeline can
skip publishing (versions already on npm) and pass verification, but a real new
release would fail at `pnpm publish`.

Decided: `.github/workflows/publish.yml` keeps only `workflow_dispatch`
(auto triggers `push: tags` and `release: published` removed), so a mirrored
tag cannot race the GitLab publish job. Dispatch against the tag ref when the
GitHub path is ever needed.

Open decision after cutover: none. GitHub mirror pushes carry tags, but nothing
automatic reacts to them any more; `ci.yml` still gates pushes to `main`.

Tool note: `node .gitnexus/run.cjs impact` timed out twice (120s) for
`tagVersionFromEnv` / `publishPlan`, so callers were confirmed by text search
instead — only `package.json` scripts, `release.js`, and the workflows invoke
this script; the exported surface (`computeNpmTag`, `npmVersionExists`) was not
touched.
