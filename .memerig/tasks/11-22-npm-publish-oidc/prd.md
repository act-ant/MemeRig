# npm publish automation: OIDC trusted publishing for 0.7.0

## Goal

Make `memerig` and `memerig-core` publishable from `blackplume233/MemeRig` without any long-lived npm token in GitHub, by moving `.github/workflows/publish.yml` to npm trusted publishing (OIDC), and ship a consistent `0.7.0` version with a migration manifest.

## Context (verified at planning time)

- The fork has **zero** workflow runs, **zero** releases, and **no** repository secrets. The successful `Publish to npm` runs belong to upstream `mindfold-ai/Trellis`.
- `registry.npmjs.org/memerig` and `/memerig-core` are both **404**: neither name has ever been published.
- `publish.yml` already declares `permissions: id-token: write`, so the GitHub side needs no new configuration for OIDC.
- `pnpm@10.32.1` cannot do OIDC publishing: its bundle contains no `NPM_ID_TOKEN` handling and no `npm:registry.npmjs.org` audience string; `pnpm publish` is implemented natively in that line (only `login`/`view`/`dist-tag`/`config` are passed through to the npm CLI). Same for `pnpm@10.34.9`, the last 10.x release.

## Requirements

- R1 — `packages/cli/package.json` and `packages/core/package.json` both declare `0.7.0`.
- R2 — `packages/cli/src/migrations/manifests/0.7.0.json` exists and satisfies the manifest schema.
- R3 — `publish.yml` publishes via trusted publishing: Node 24, pnpm 12.x, no `NODE_AUTH_TOKEN`, no `NPM_CONFIG_PROVENANCE`, no `registry-url` (which would inject `_authToken=${NODE_AUTH_TOKEN}`).
- R4 — `packageManager` in the root `package.json` matches the pnpm version CI uses, and `pnpm-lock.yaml` is regenerated for it.
- R5 — `release-process.md` documents the trusted-publishing prerequisites, including the unavoidable first-publish bootstrap.
- R6 — npm-side configuration steps are documented precisely enough that the human owner can execute them without further research.

## Constraints

- Trusted publishing **cannot** be configured before the package exists on npm, so the first publish of `memerig`/`memerig-core` must be token-based or manual. This exception is recorded, not silently taken.
- pnpm 12 pins itself into the lockfile (`packageManagerDependencies` + `@pnpm/exe.*` platform packages). Accepted: ~165 added lockfile lines.
- No behavior change for CLI users beyond the release metadata.

## Acceptance Criteria

- [ ] `node packages/cli/scripts/release-preflight.js check-versions` reports `memerig-core@0.7.0 = memerig@0.7.0`.
- [ ] `release-preflight verify-packed-cli` reports the packed CLI pins `memerig-core` to exact `0.7.0`.
- [ ] `release-preflight publish-plan` plans `latest` for both packages.
- [ ] `pnpm install --frozen-lockfile` succeeds with pnpm 12.21.0 on a clean checkout of the regenerated lockfile.
- [ ] `pnpm typecheck` and `pnpm test` pass under pnpm 12.
- [ ] Manifest continuity check passes with `0.7.0` present.
- [ ] `publish.yml` contains no `NPM_TOKEN`, `NODE_AUTH_TOKEN`, `registry-url`, or `NPM_CONFIG_PROVENANCE`.

## Out of scope

- Creating the npm-side trusted publisher (needs the human owner + 2FA on npmjs.com).
- The one-off bootstrap publish itself; the mechanism and exact commands are documented instead.
