# Migrate CI and release upstream to GitLab

## Goal

Platgit (self-hosted GitLab) becomes the primary upstream for MemeRig: the
release pipeline and the release preflight must work from GitLab CI/CD, while
GitHub stays a mirror that runs the same gates.

## Requirements

1. `.gitlab-ci.yml` at the repository root reproduces the GitHub gate order:
   Python 3.9 syntax → typecheck → python lint → eslint → build → test →
   build-output check, on branch/MR pipelines; publish on `v*` tag pipelines.
2. `release-preflight` detects a tag from either host: `CI_COMMIT_TAG` (GitLab)
   in addition to `GITHUB_REF` / `GITHUB_REF_NAME` (GitHub).
3. `publish-plan` can hand the plan to a GitLab job without `$GITHUB_OUTPUT`,
   producing a dotenv file in the same `key=value` shape GitHub consumes.
4. Publishing stays idempotent: a re-run on an already-published tag skips the
   npm publish and only verifies visibility.
5. Contributor docs state the topology (GitLab primary, GitHub mirror) and the
   GitLab project settings publishing depends on.

## Constraints

- platgit is a self-hosted instance: npm trusted publishing (OIDC) is only
  available for GitLab.com shared runners, so the publish job authenticates
  with a masked `NPM_TOKEN` variable and `NPM_CONFIG_PROVENANCE=false`.
- Protected CI/CD variables reach a job only for protected refs, so `v*` tags
  must be protected on the GitLab project.
- `release.js` pushes `origin` and asserts the tag landed there; once GitLab is
  `origin`, the script needs no change.

## Acceptance Criteria

- [x] `.gitlab-ci.yml` parses and defines `test` + `publish` stages with the
      gate order above.
- [x] `release-preflight check-versions --require-tag` succeeds with
      `CI_COMMIT_TAG=v<version>` and fails on a branch pipeline.
- [x] `release-preflight publish-plan --dotenv <file>` writes
      `version=/tag=/core_publish=/cli_publish=/...` and the values can be
      sourced by bash.
- [x] Integration test covers GitHub tag, GitLab tag, branch pipeline, and
      mismatched tag.
- [x] README documents the topology and required project settings.
- [ ] GitLab project exists, remote `origin` points at it, a tag pipeline ran
      green on platgit. **Blocked**: platgit unreachable from this machine
      (SSH 22 timeout, HTTPS handshake failure) while the work was done.
