# 项目采用默认 Rules 并发布

## Goal

让 MemeRig 自身采用已交付的默认 Rules，保留已有修改，验证并提交后按仓库发布流程发布。

## Requirements

- Adopt only the default `core.md` and `index.md` under this repository's `.memerig/rules/`, matching the canonical bundled documents.
- Route the repository's main-agent instructions and task-context curation to the default rule bodies; do not adopt optional catalog rules implicitly.
- Preserve existing AGENTS/CLAUDE, GitNexus, journal, and unrelated staged changes. Commit only this task's changes.
- Publish the Rules feature and self-adoption through the existing GitHub Actions release workflow, never through local npm publication.
- Use the next stable patch, `0.7.3`, following the repository's default release command. Keep `memerig` and `memerig-core` versions and `latest` tags aligned.
- Verify the release package contains the default Rules and that official registry metadata exposes both published packages.

## Acceptance Criteria

- [x] Local default Rules match the canonical templates; repository entrypoints and this task's manifests reference their actual bodies.
- [ ] Existing unrelated changes remain outside the selective commit and publication artifact.
- [x] Release manifest, synchronized package versions, and packed CLI dependency satisfy the release preflight checks.
- [x] Built-package Rules are exercised through fresh init and no-op update smoke checks.
- [ ] The `v0.7.3` tag is pushed to the intended repository and the publish workflow succeeds.
- [ ] Public npm exposes both packages at `0.7.3` with `latest` and the CLI pins core to `0.7.3`.

## Constraints and evidence

- Public npm and local package versions are `0.7.2`; origin has no `v0.7.3` tag.
- `.memerig/rules/` is currently absent. Existing root instruction files contain local modifications and must be edited surgically.
- `release.js` uses a broad Git staging sweep. Do not invoke that sweep in this shared dirty worktree; use selective commits and the same preflight/tag/CI sequence instead.
- GitHub CLI's inferred repository resolves to upstream Trellis. Every release operation must explicitly identify the confirmed origin repository.
- `.memerig/spec/cli/backend/release-process.md` requires CI-only publishing and explicit workflow dispatch against the release tag.
- Out of scope: optional rule adoption, modifying publishing credentials, changing Rules semantics, or resolving unrelated CLI defects.
- Release continuity exposed a missing historical `0.0.0-stage` record. The public tarball contains only package.json (`stub: true`) and README.md, verified against registry SHA1 `881fc7606c6e2ab8f90da07a709aaa54dab11321`; add an accurate no-file-migrations history record rather than bypass the gate.
