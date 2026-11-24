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

## Not done — blocked on platgit being unreachable

From this machine: `ssh git@platgit.mihoyo.com` → port 22 timeout;
`https://platgit.mihoyo.com/...` → TLS handshake failure; `glab api` → no API.
GitHub SSH works, so the block is specific to platgit (VPN/network).

Remaining steps, in order:

```bash
# 1. Create the GitLab project (namespace TBD, e.g. exp/kl/aift/memerig).
# 2. Point the working copy at it and push the current main + tags.
git remote rename origin github
git remote add origin git@platgit.mihoyo.com:exp/kl/aift/memerig.git
git push -u origin main
git push origin --tags
```

3. Project settings: Settings → Repository → **Protected tags** add `v*`;
   Settings → CI/CD → **Variables** add `NPM_TOKEN` (masked + protected).
4. Confirm the runners can pull `node:24` and `python:3.9`; otherwise set
   `NODE_IMAGE` and the Python job's `image:` to internal mirrors.
5. Run a pipeline on `main`, then `glab ci lint` / web lint against
   `.gitlab-ci.yml`.

Open decision after cutover: GitHub mirror pushes also carry tags, so
`.github/workflows/publish.yml` (`push: tags`) can fire alongside the GitLab
job. Publishing stays idempotent, but two concurrent publishes race on the
first `pnpm publish`. Either restrict the GitHub workflow to
`workflow_dispatch`, or leave Actions off on the mirror.

Tool note: `node .gitnexus/run.cjs impact` timed out twice (120s) for
`tagVersionFromEnv` / `publishPlan`, so callers were confirmed by text search
instead — only `package.json` scripts, `release.js`, and the workflows invoke
this script; the exported surface (`computeNpmTag`, `npmVersionExists`) was not
touched.
