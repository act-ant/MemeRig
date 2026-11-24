# 发布 0.7.4：用户级 Rules 注入

## Goal

将已完成的用户级 Rules 注入作为 `0.7.4` patch 正式发布到 npm，两个包版本锁定为 `0.7.4`，npm dist-tag 为 `latest`。

## 已确认

- 目标版本 `0.7.4`；`memerig` 与 `memerig-core` 同步。
- 发布通道：GitHub Actions 手动 dispatch `publish.yml`。GitLab 项目路径 `exp/kl/aift/memerig` 当前返回 404，GitLab 主通道暂不可用。
- 当前 `main` 比 `origin/main` 多两个提交，包含用户级 Rules 功能与 GitLab CI 迁移提交。
- 不使用 `release.js` 的整树 `git add -A`；共享工作区存在其他未提交修改，必须选择性提交。

## Requirements

- 新增 `packages/cli/src/migrations/manifests/0.7.4.json`：非 breaking、无迁移，changelog 覆盖用户级 Rules 的注入、`load` 语义与边界。
- 将两个 `package.json` 版本同步提升到 `0.7.4`，保持 CLI 源码依赖 `memerig-core: workspace:*`。
- 只提交 manifest 与两个 `package.json`；不扫入 `.memerig/`、AGENTS/CLAUDE 等无关修改。
- 打 annotated tag `v0.7.4`，推送 `main` 与 tag 到 `origin`。
- 以 tag ref 手动触发 GitHub `publish.yml`；等待发布任务，核验官方 npm 上两个包均为 `0.7.4` 且 `latest` 指向该版本。
- 任一步失败时保留版本身份，修复后重跑幂等 CI；不在本地执行 `npm publish`。

## Acceptance Criteria

- [x] `check-versions` 通过，manifest continuity 通过（官方 registry）。
- [x] `verify-packed-cli` 通过，打包后的 CLI 精确依赖 `memerig-core@0.7.4`。
- [x] 选择性提交只包含 manifest 与两个 package 版本文件。
- [x] `v0.7.4` 为 annotated tag，指向发布提交，并已推送到 `origin`。
- [x] GitHub publish workflow 成功；npm 官方 registry 上两个包 `0.7.4` 可见，`latest` 指向 `0.7.4`。

## Out of Scope

- 创建或修复 GitLab 项目、修改 GitLab CI/CD 变量、双通道发布。
- 本地 npm 发布、force-move 已存在 tag、覆盖已发布版本。
- 将无关工作区修改纳入发布提交。

## References

- [Design](design.md)
- [Implementation plan](implement.md)
- `.memerig/spec/cli/backend/release-process.md`
