# 修复 bump-versions Windows 入口判断

## Goal

`node packages/cli/scripts/bump-versions.js patch` 在 Windows 上必须真正执行版本提升，而不是静默退出。

## 已确认

- 根因：入口判断比较 `import.meta.url` 与 `file://${process.argv[1]}`。Windows 下 argv 形如 `C:\...\bump-versions.js`，拼出 `file://C:\...`，而 `import.meta.url` 是 `file:///C:/...`，永不相等。
- 影响：`release.js` 调用该脚本时得到空版本字符串，发布流程在 Windows 本地无法完成 bump。

## Requirements

- 用 `pathToFileURL(path.resolve(process.argv[1]))` 生成规范 file URL 后与 `import.meta.url` 比较。
- 保持被 import 时不执行 `main()` 的既有行为。
- 不修改版本计算、读写文件或错误处理逻辑。
- 新增回归测试：在临时目录复制脚本与两个 package.json，真实执行 `node bump-versions.js patch`，断言 stdout 为下一版本且两个文件同步更新。

## Acceptance Criteria

- [x] Windows 上直接运行脚本会输出新版本并更新两个 `package.json`。
- [x] 新增测试在真实脚本入口路径上通过。
- [x] 相关 lint/typecheck 与脚本测试通过。

## Verification

- `pnpm vitest run test/scripts/bump-versions-entry.integration.test.ts` — 2 passed on Windows: direct execution bumps both packages to `0.7.5`; module import leaves them at `0.7.4`.
- `pnpm eslint test/scripts/bump-versions-entry.integration.test.ts` — clean; `scripts/` is outside the linted tree.
- `pnpm typecheck` — clean.

## Out of Scope

- 修改 `release.js` 的发布流程、staging 策略或 CI。
- 变更版本号语义或 manifest 生成。
