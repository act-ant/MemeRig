# 初始模板与 Marketplace 发布

## Goal

建立空白默认和三套可选模板，定义 Marketplace 发布与离线分发

## Requirements

- Blank initialization contributes only the files required for repository-local operation and imposes no project-specific rules.
- Provide explicitly selected `learn-harness`, `trellis`, and `game-dev` presets from traceable sources. They share the base runtime and work offline from the release artifact.
- Document how maintainers publish a template to Marketplace, adopt a fixed revision, and review upgrades. A collaborator receives the adopted template through Git.

## Acceptance Criteria

- [x] From the built distribution, initialization succeeds when network fetches are disabled with no preset and with each of the three presets. The default creates neither project specs nor onboarding tasks.
- [x] Each listed Marketplace entry resolves to its actual directory and selects the same spec content shipped in the release artifact.
- [x] Preset sources and attribution are recorded. The Game Dev preset is labeled as original until an upstream source can be verified.
- [x] Applying a template to an existing project exposes changes for review and preserves project edits.
