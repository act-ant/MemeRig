# Release execution plan

1. Create `0.7.4.json` through `create-manifest.js` (stdin JSON, non-breaking, no migrations).
2. Bump both package versions with `node packages/cli/scripts/bump-versions.js patch`.
3. Run local gates:
   ```bash
   node packages/cli/scripts/release-preflight.js check-versions
   npm_config_registry=https://registry.npmjs.org/ node packages/cli/scripts/check-manifest-continuity.js
   pnpm --filter memerig-core build && pnpm --filter memerig build
   node packages/cli/scripts/release-preflight.js verify-packed-cli
   node packages/cli/scripts/release-preflight.js publish-plan
   ```
4. Selectively commit the manifest and two package.json files as `chore(release): 0.7.4`.
5. Create annotated tag `v0.7.4`; verify `git tag -v`/`cat-file` points at the release commit.
6. Push `main` and `v0.7.4` to `origin`.
7. Dispatch the GitHub publish workflow against the tag:
   ```bash
   gh workflow run publish.yml --repo act-ant/MemeRig --ref v0.7.4
   ```
8. Watch the run; on failure inspect the failing gate and re-dispatch after a fix.
9. Verify official npm:
   ```bash
   npm view memerig@0.7.4 version dist-tags --json --registry=https://registry.npmjs.org/
   npm view memerig-core@0.7.4 version dist-tags --json --registry=https://registry.npmjs.org/
   ```
10. Record evidence, complete the task, and report the run URL and registry result.

## Safety

- Never run `npm publish` / `pnpm publish` locally.
- Do not use `release.js` in this dirty worktree.
- Do not force-move or recreate an existing published tag/version.
- If GitHub Actions cannot authenticate npm, stop and report the failed run instead of switching to a local publish.

## Execution evidence

- Remote topology changed during the release: `origin` now points at `git@platgit.mihoyo.com:exp/kl/aift/memerig.git`; `github` is `git@github.com:act-ant/MemeRig.git`.
- Manifest `0.7.4.json` created (non-breaking, no migrations); both packages bumped to `0.7.4`.
- Local gates: `check-versions` ok; `check-manifest-continuity` ok with official registry; `verify-packed-cli` ok (`memerig-core@0.7.4` exact); `publish-plan` reported `publish` for both.
- Selective commits: `339fa514` (`chore(release): 0.7.4`, two package.json) and `d4b199e5` (`chore(release): add 0.7.4 manifest`).
- Annotated tag `v0.7.4` created on `d4b199e5`; pushed to `origin` (GitLab) and mirrored to `github`.
- GitLab tag pipeline 3930995 failed at `publish`: the project has no CI/CD variables (`NPM_TOKEN` absent), so `pnpm publish` returned 404. Test stages passed; this is a project-settings gap, not a code failure.
- GitHub `publish.yml` dispatched against `v0.7.4`: run 45368209814 succeeded in 8m4s, including `verify-npm`.
- Official registry: `memerig@0.7.4` and `memerig-core@0.7.4` visible; both `latest` dist-tags point to `0.7.4`.
- Pre-existing annotation: GitHub reports Node.js 20 action runtime deprecation for `actions/checkout`, `actions/setup-node`, and `pnpm/action-setup`; no workflow change made.
