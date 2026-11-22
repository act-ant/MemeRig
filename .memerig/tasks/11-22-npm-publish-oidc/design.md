# Design — OIDC trusted publishing for 0.7.0

## Authentication path

```
GitHub Actions job (ubuntu-latest, permissions.id-token: write)
  └─ pnpm publish --tag <tag>          (pnpm 12.21.0, native OIDC)
       ├─ OIDC token  →  registry.npmjs.org exchange  →  short-lived publish credential
       ├─ provenance attestation (automatic for public package + public repo)
       └─ PUT /<pkg>  (memerig-core first, then memerig)
```

No secret material is stored anywhere: the credential lives for the duration of one publish.

## Why pnpm 12 rather than `pnpm pack` + `npm publish <tgz>`

| Option | Workspace dep rewrite | OIDC | Lockfile churn | Verdict |
|---|---|---|---|---|
| `pnpm publish` on pnpm 12 | native | native | +165 lines (`packageManagerDependencies`, `@pnpm/exe.*`) | **chosen** (user's call: "升到最新") |
| `pnpm publish` on pnpm 10 | native | none (verified) | none | rejected |
| `pnpm pack` + `npm publish <tgz>` on pnpm 10 | pnpm | npm CLI | none | fallback only; loses pnpm's own provenance path |

The pnpm 10 check is empirical, not hearsay: `pnpm@10.32.1` and `pnpm@10.34.9` bundles (7.8 MB / 8.7 MB `dist/pnpm.cjs`) contain zero occurrences of `NPM_ID_TOKEN` or `npm:registry.npmjs.org`, while their `runNpm` helper is wired only to `config`/`view`/`dist-tag`/`login` pass-through commands, not to `publish`.

## Version source of truth

- `packages/{cli,core}/package.json` `version` — checked equal by `release-preflight check-versions`.
- Git tag `v<version>` — required in CI via `--require-tag`.
- `pnpm publish` rewrites `workspace:*` → exact version; `verify-packed-cli` asserts this on the packed tarball.
- Root `package.json` `packageManager` — must equal the pnpm minor used locally and in CI, otherwise pnpm 12 self-switches to the pinned 10.32.1 and silently loses OIDC (observed in a clean-room test: `npx pnpm@12.21.0` printed `using pnpm v10.32.1`).

## Risk register

| Risk | Mitigation |
|---|---|
| Trusted publisher config expires after 2 days if unvalidated | Configure it only when a `v0.7.0` tag push is imminent; recreate on expiry |
| Bootstrap publish breaks the spec's CI-only rule | Explicit documented exception in `release-process.md`; token revoked / token publishing disallowed right after |
| pnpm 12 build/test regressions | `pnpm install --frozen-lockfile` + `typecheck` + `test` run locally before commit |
| Lockfile pins pnpm binaries for every platform | Accepted; `@pnpm/exe.*` entries are resolution-only, nothing is installed at runtime |

## Rollback

Revert the commit: restore `packageManager: pnpm@10.32.1`, the previous `pnpm-lock.yaml`, the `publish.yml` env block, and delete `manifests/0.7.0.json` (safe while `0.7.0` is unpublished; once published, its manifest is contract and a new version is required).
