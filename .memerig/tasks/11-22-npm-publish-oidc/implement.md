# Implement — OIDC trusted publishing for 0.7.0

## Ordered steps

1. **Versions** — set `version` to `0.7.0` in `packages/cli/package.json` and `packages/core/package.json`.
   - Verify: `node packages/cli/scripts/release-preflight.js check-versions`
2. **Manifest** — `packages/cli/src/migrations/manifests/0.7.0.json` via `node scripts/create-manifest.js` (stdin JSON mode).
3. **Toolchain** — root `package.json` `packageManager: pnpm@12.21.0`; regenerate `pnpm-lock.yaml` with pnpm 12; re-run `pnpm install --frozen-lockfile`.
4. **Workflow** — `publish.yml`: Node 24, pnpm 12.21.0, drop `registry-url`, drop `NODE_AUTH_TOKEN` and `NPM_CONFIG_PROVENANCE` from both publish steps; comment why `id-token: write` is now the auth mechanism.
5. **Spec** — `release-process.md`: trusted-publishing prerequisites, CI version constraints, bootstrap exception, checklist item.
6. **Gates** — `check-versions`, `verify-packed-cli`, `publish-plan`, `check-manifest-continuity`.
7. **CI equivalence** — `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test`.

## Validation commands

```bash
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-cli
node packages/cli/scripts/release-preflight.js publish-plan
(cd packages/cli && node scripts/check-manifest-continuity.js)
pnpm install --frozen-lockfile
pnpm typecheck && pnpm test
grep -nE "NPM_TOKEN|NODE_AUTH_TOKEN|registry-url|NPM_CONFIG_PROVENANCE" .github/workflows/publish.yml   # must be empty
```

## Human-only steps (cannot be automated here)

```bash
# after the packages exist on npm (bootstrap done):
npm trust github memerig      --file publish.yml --repo blackplume233/MemeRig --allow-publish --registry=https://registry.npmjs.org/
npm trust github memerig-core --file publish.yml --repo blackplume233/MemeRig --allow-publish --registry=https://registry.npmjs.org/
```

Then push tag `v0.7.0` (or publish a GitHub Release) and confirm the run reaches
`Verify published packages on public npm`.

## Rollback points

- Before commit: `git checkout -- pnpm-lock.yaml package.json .github/workflows/publish.yml`
- After commit, before publish: revert commit; delete `manifests/0.7.0.json`
