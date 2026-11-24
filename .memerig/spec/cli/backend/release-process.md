# Release Process

> Release, versioning, docs, and npm publishing rules for the MemeRig monorepo.

---

## Overview

MemeRig publishes two npm packages from one git tag:

| Package | Role | Published by |
|---|---|---|
| `memerig` | User-facing CLI | GitHub Actions only |
| `memerig-core` | Programmatic core APIs used by the CLI and external integrations | GitHub Actions only |

The package pair is version-locked. Every published version must exist for both packages with the exact same version and npm dist-tag.

---

## CI-only publishing

Official npm publishing must happen through `.github/workflows/publish.yml`.

Do not run `npm publish` or `pnpm publish` locally for official MemeRig packages. Local machines may run `pnpm pack`, `release-preflight`, tests, lint, typecheck, and dry-run checks, but not package publication.

If a CI publish looks partial or inconsistent:

1. Inspect the GitHub Actions publish run.
2. Verify public npm visibility:
   ```bash
   npm view memerig@<version> version dist-tags --json --registry=https://registry.npmjs.org/
   npm view memerig-core@<version> version dist-tags --json --registry=https://registry.npmjs.org/
   ```
3. Fix the workflow or release scripts.
4. Re-run the CI path or move the tag after the fix when the same version is still the intended release artifact.

Do not compensate by publishing one missing package locally. That creates a release artifact without CI provenance and hides the workflow failure from the next release.

The publish workflow must verify both packages after publish with:

```bash
node packages/cli/scripts/release-preflight.js verify-npm --package all
```

---

## Publishing credential

**Current mode: npm token.** `publish.yml` authenticates with the
`NPM_TOKEN` secret (organization secret on `act-ant`, visibility `all`). It
mints nothing and requires no npm-side configuration per package.

| Piece | Value | Why |
|---|---|---|
| Job permissions | `contents: read` only | no `id-token: write`, so pnpm does not attempt an OIDC exchange that would 404 against packages without a trusted publisher |
| `NODE_AUTH_TOKEN` | `secrets.NPM_TOKEN` | read by the "Verify npm credential" and "Configure npm auth for pnpm" steps, then by `pnpm publish` |
| `.npmrc` | written by the workflow | pnpm reads credentials from `.npmrc`; setup-node does not write one (no `registry-url`) |
| Provenance | **not generated** | sigstore attestations need an OIDC identity; `NPM_CONFIG_PROVENANCE` is deliberately absent because with a token npm reports no attestation anyway |
| Node / pnpm | 24 / 12.21.0 | pnpm 12 for the workspace rewrite (`workspace:*` → exact version) |

Token requirements, learned the hard way: a token that cannot bypass 2FA makes
`pnpm publish` fail with `ERR_PNPM_OTP_NON_INTERACTIVE` even though `whoami`
returns 200. Use a granular token with **Bypass 2FA** or a classic
**Automation** token.

Rotating the credential: regenerate on npm, then
`gh secret set NPM_TOKEN --org act-ant --visibility all --body "$TOKEN"`.

### Switching to OIDC trusted publishing (deferred, not abandoned)

Trusted publishing removes the token and adds provenance. It is deferred
because the packages only just came into existence, and it is optional, not a
prerequisite for releasing.

To switch:

1. On `npmjs.com` → package → Settings → Trusted Publisher → GitHub Actions:
   owner `act-ant`, repository `MemeRig`, workflow filename `publish.yml`,
   environment blank, allowed action "`npm publish`". Do it for **both**
   `memerig` and `memerig-core`.
2. A new trusted-publisher configuration must complete a successful publish
   within **2 days** or it expires; create it when a release is imminent.
3. In `publish.yml`: add `id-token: write` back to the job permissions and
   delete the `NODE_AUTH_TOKEN` env blocks plus the two credential steps.
4. After the first OIDC publish succeeds, set package Settings → Publishing
   access to "Require two-factor authentication and disallow tokens".
5. Rotate/revoke the token and drop the `NPM_TOKEN` secret.

Node >= 22.14 / npm >= 11.5.1 / pnpm >= 12 are already satisfied by the
current workflow, so no toolchain change is needed.

---

## Version invariants

| Invariant | Rule |
|---|---|
| Shared version | `packages/cli/package.json` and `packages/core/package.json` must have the same `version`. |
| Shared tag | Git tag `v<version>` must match both package versions. |
| Shared npm dist-tag | `beta` for `-beta.N`, `rc` for `-rc.N`, `alpha` for `-alpha.N`, `latest` for GA. |
| Source dependency | CLI source depends on core with `workspace:*`. |
| Packed dependency | Published CLI package must depend on `memerig-core` with the exact release version. |

`packages/cli/scripts/release-preflight.js` is the source of truth for these checks.

Required gates:

```bash
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-cli
node packages/cli/scripts/release-preflight.js publish-plan
```

---

## Branch and release tracks

| Track | Branch pattern | Version pattern | npm tag | Notes |
|---|---|---|---|---|
| Stable | `main` | `X.Y.Z` | `latest` | Patch/minor/major GA releases. |
| Beta | `feat/vX.Y.Z-beta` or equivalent long-lived beta branch | `X.Y.Z-beta.N` | `beta` | Feature incubation. CLI and core both publish beta versions. |
| RC | release candidate branch or the stabilized beta branch | `X.Y.Z-rc.N` | `rc` | Pre-GA validation. CLI and core both publish rc versions. |
| GA promotion | stable release branch / `main` | `X.Y.Z` | `latest` | Promote the release candidate into the stable docs and latest npm tag. |

A new beta cycle starts from the current stable/release baseline and uses the next minor or major version, for example `0.6.0-beta.0` after `0.5.x`. It does not continue an older beta line after that line has moved to RC or GA.

Stable fixes normally flow from `main` to beta/rc by cherry-pick. Beta-only features do not flow back to `main` by cherry-pick; rewrite them as stable-ready commits when needed.

---

## Marketplace is in-tree

`marketplace/` is a normal directory in this repository, not a submodule. Changes to its templates ship in the same commit as the code that needs them, and `templates/memerig.test.ts` diffs `marketplace/workflows/native/workflow.md` against the bundled workflow so the two cannot drift. The repository has no submodules, so there is no submodule push ordering to verify before tagging.

### Contract: the pre-release sweep MUST exclude `.memerig/`

The pre-release `git add` in `release.js` (the `chore: pre-release updates`
commit) **must** exclude `.memerig/` from its pathspec:

```js
run("git add -A -- ':!.memerig'");
```

`.memerig/tasks/` is not gitignored, so a blanket `git add -A` sweeps in any
dirty in-progress task dirs, workspace journal drafts, and runtime artifacts
that happen to be present in the release session. Staging `.memerig/` is only
ever allowed through `common/safe_commit.py`'s precise allowlist (see the
"unscoped `.memerig` staging" bug class in `script-conventions.md`) — never
through a release-time blanket stage.

> **Incident note (2026-06, upstream #303).** A `release.js` pre-release
> `git add -A` that excluded only the submodule paths swept 6 unrelated
> in-progress task files into the pre-release commit twice, and the
> maintainer had to `git rm --cached` them three times before tracking the
> drafts stopped the bleed. The same staging-scope defect also lives in
> `add_session.py` and in ad-hoc human/AI `git add -A`. This contract exists
> so the release route can never re-open that escape hatch. See
> `script-conventions.md` → "Absolute prohibition: never blanket-stage" for
> the full bug-class writeup.

---

## Manifest continuity across branches

Each release branch maintains its own `packages/cli/src/migrations/manifests/<version>.json`. The CLI update logic walks the manifest chain between `fromVersion` and `toVersion`, so every published version that a user can upgrade through must have a local manifest on the release branch.

When a stable patch manifest is missing from a beta branch:

```bash
git show main:packages/cli/src/migrations/manifests/<version>.json \
  > packages/cli/src/migrations/manifests/<version>.json
git add packages/cli/src/migrations/manifests/<version>.json
git commit -m "chore: restore manifest <version> from main"
```

Restore published manifests deliberately. Do not auto-merge whole manifest directories across release branches, because branch-specific manifests can mention files that do not exist on the other branch.

---

## Release command sequence

The root release scripts delegate to the CLI package:

```bash
pnpm release
pnpm release:beta
pnpm release:rc
pnpm release:promote
```

`packages/cli/scripts/release.js` runs:

1. `check-manifest-continuity`
2. core tests
3. CLI tests
4. pre-release commit excluding `.memerig`
5. `bump-versions.js <type>` to update both package versions together
6. `release-preflight check-versions`
7. version commit with the version string as the commit message
8. git tag `v<version>`
9. push branch and tags
10. GitHub Actions publish workflow builds, tests, packs, publishes, and verifies both packages

The release script does not publish locally. The pushed tag is what starts official npm publication.

---

## Publish workflow sequence

`.github/workflows/publish.yml` runs on `v*` tag push, GitHub Release publication, and manual `workflow_dispatch`. It is idempotent for reruns on the same tag.

This fork does not start runs for `push` events (both workflows report `active`, yet `push` produces zero runs while `workflow_dispatch` works). Until that is fixed upstream of us, publish with:

```bash
git push origin v<version>
gh workflow run publish.yml --ref v<version>      # ref must be the tag
```

Dispatch against the tag ref, not `main`: `check-versions --require-tag` reads `GITHUB_REF_NAME`.

The same applies to CI: `gh workflow run ci.yml --ref main`. `ci.yml` is pinned to `ubuntu-24.04` because `ubuntu-latest` (26.04) has no Python 3.9 build for the minimum-supported-Python gate.

Required order:

1. install dependencies
2. `release-preflight check-versions --require-tag`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`
6. `release-preflight verify-packed-cli`
7. `release-preflight publish-plan --github`
8. publish `memerig-core` if missing
9. publish `memerig` if missing
10. `release-preflight verify-npm --package all`

Core publishes first because the CLI package depends on the exact core version in the packed artifact.

---

## Artifact verification for release-claimed assets

Any changelog, docs page, or marketplace entry that says a feature is "bundled",
"installed automatically", or "included with MemeRig" must be verified against
the built package artifact, not only against the source tree.

Before tagging a release that adds or changes a bundled template, skill,
workflow, hook, script, or generated platform asset:

1. Run the CLI build.
2. Run `npm pack --dry-run --json` from `packages/cli/` and check the expected
   `dist/templates/**` paths are present.
3. Use the built binary (`node packages/cli/bin/memerig.js`) in a fresh temp
   git repository and run the user-facing command that should install the
   asset.
4. Check both the generated files and `.memerig/.template-hashes.json` for the
   expected paths.
5. Run `memerig update --dry-run` from the temp repository and confirm it
   reports the project is already up to date.

This gate is required when docs are updated before or separately from the code
branch that actually adds the distributable files. A source file existing on
another branch, in `marketplace/`, or in a docs submodule is not evidence that
the npm package contains it.

Example for a built-in multi-file skill:

```bash
pnpm --filter memerig build

cd packages/cli
npm pack --dry-run --json | grep 'dist/templates/common/bundled-skills/<skill>/SKILL.md'
cd ../..

tmpdir=$(mktemp -d /tmp/memerig-release-smoke-XXXXXX)
printf '{"name":"memerig-smoke","version":"0.0.0"}\n' > "$tmpdir/package.json"
git -C "$tmpdir" init -q
(
  cd "$tmpdir"
  node /path/to/MemeRig/packages/cli/bin/memerig.js init -u smoke --yes --claude --codex
  test -f .claude/skills/<skill>/SKILL.md
  test -f .agents/skills/<skill>/SKILL.md
  grep -q '<skill>' .memerig/.template-hashes.json
  node /path/to/MemeRig/packages/cli/bin/memerig.js update --dry-run
)
```

---

## Pre-release checklist

- [ ] Worktree is clean except intentional release changes.
- [ ] Relevant coding specs have been read.
- [ ] Manifest exists for the target version.
- [ ] `NPM_TOKEN` (org `act-ant`, visibility `all`) is present and can bypass 2FA (`ERR_PNPM_OTP_NON_INTERACTIVE` means it cannot). While OIDC is deferred this is the publishing credential; see "Publishing credential" above.
- [ ] Release notes for the target version are written (the manifest `changelog`).
- [ ] `node packages/cli/scripts/release-preflight.js check-versions` passes.
- [ ] `node packages/cli/scripts/release-preflight.js verify-packed-cli` passes.
- [ ] Release-claimed bundled assets are verified in `npm pack --dry-run --json` and a fresh temp-directory `memerig init` / `memerig update --dry-run` smoke test.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass or the blocker is recorded.
- [ ] Breaking releases include `migrationGuide` and `aiInstructions` in the manifest.
- [ ] Official package publication is left to CI.

---

## Cross-references

- Core/CLI code ownership and package boundaries: `memerig-core-sdk.md`
- Manifest format and migration types: `migrations.md`
- Native dependency policy: `quality-guidelines.md`
