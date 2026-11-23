# MemeRig

**面向游戏开发和 Agent 开发的 Agent Harness。** MemeRig 把规范、任务和会话记忆保存在仓库里，让每个编程 Agent 在每次会话开始时遵循同一套约定，并从上一次停下的地方继续。

[English](./README.md)

> **MemeRig 是 [Mindfold](https://github.com/mindfold-ai) 开源项目 [Trellis](https://github.com/mindfold-ai/Trellis) 的 fork。**
> 它基于 Trellis 的 [`f089cb3`](https://github.com/mindfold-ai/Trellis/commit/f089cb3286071199e84118dee86b6d76aab032f1) 提交创建，沿用了它的架构：分层规范、任务 PRD、工作流阶段、hook 注入上下文，以及多平台生成器。这些基础归功于 Trellis 的作者。MemeRig 独立维护，与 Mindfold 没有隶属或背书关系。两个项目都使用 AGPL-3.0 许可证。

## 相对 Trellis 的改动

| 方面 | Trellis | MemeRig |
| --- | --- | --- |
| 项目目录 | `.trellis/` | `.memerig/` |
| 命令行 | `trellis`、`tl` | `memerig`、`mrig` |
| npm 包 | `@mindfoldhq/trellis`、`@mindfoldhq/trellis-core` | `memerig`、`memerig-core` |
| 技能 | `trellis-brainstorm`、`trellis-check`… | `brainstorm`、`check`…（无前缀） |
| 子 Agent | `trellis-implement`、`trellis-check`、`trellis-research` | `memerig-implement`、`memerig-check`、`memerig-research` |
| 斜杠命令 | `/trellis:start`、`/trellis:finish-work` | `/memerig:start`、`/memerig:finish-work` |
| 环境变量 | `TRELLIS_*` | `MEMERIG_*` |
| 模板市场 | `mindfold-ai/marketplace` 子模块 | 内置在 [`marketplace/`](./marketplace) |

子 Agent 保留前缀，是因为主会话按名字派发它们，而 `check`、`implement` 这类通用名字容易和项目自己定义的 Agent 撞名。

## 环境要求

- Node.js 18.17 或更高版本
- Python 3.9 或更高版本

## 快速开始

```bash
# 安装命令行
npm install -g memerig

# 在仓库中初始化
memerig init -u your-name

# 或只初始化你实际使用的平台
memerig init --claude --codex --omp -u your-name
```

`memerig init` 会创建 `.memerig/`，并为你选择的每个 Agent 生成对应的平台文件。运行 `memerig platforms` 可以列出所有支持的宿主。

## 工作原理

MemeRig 把每个任务分成四个阶段：

1. **规划**：`brainstorm` 技能逐个问题梳理需求并写出 `prd.md`。复杂任务还会有 `design.md` 和 `implement.md`。
2. **实现**：`memerig-implement` 子 Agent 根据 PRD 写代码，相关规范会注入到它的上下文里。
3. **检查**：`memerig-check` 子 Agent 对照规范审查改动，并运行 lint、类型检查和测试。
4. **收尾**。`/memerig:finish-work` 原地完成任务并记录会话日志。`update-spec` 技能把新经验写回 `.memerig/spec/`。

| 路径 | 内容 |
| --- | --- |
| `.memerig/spec/` | 编码规范，按包和层划分 |
| `.memerig/tasks/` | 任务 PRD、设计、调研和上下文清单 |
| `.memerig/workspace/` | 每位开发者的会话日志 |
| `.memerig/workflow.md` | 阶段定义和每轮的工作流状态提示 |
| `.agents/skills/` | 遵循 agentskills.io 目录约定、跨宿主共享的技能 |

## 开发 MemeRig

MemeRig 用 MemeRig 自己开发：仓库里的 `.memerig/`、`.claude/`、`.cursor/`、`.opencode/`、`.codex/`、`.pi/`、`.agents/skills/` 由命令行根据 `packages/templates/assets/` 生成。

```bash
pnpm install
pnpm build
pnpm test
```

修改现有模板的内容后，在仓库根目录执行：

```bash
pnpm sync:templates
pnpm update:self
```

`sync:templates` 将模板同步到 `packages/cli/dist/`，无需编译 TypeScript。`update:self` 用本地构建的 CLI 刷新仓库配置，根据系统生成 Python 命令（Windows 用 `python`，其他平台用 `python3`），也可用 `MEMERIG_PYTHON_CMD` 指定。可用 `pnpm update:self --dry-run` 预览改动。遇到 `.memerig/config.yaml` 的更新提示时，保留仓库配置。

首次检出、修改 TypeScript，或删除、重命名模板后，先运行 `pnpm build`，再运行 `pnpm update:self`。

改 hook 或工作流会影响你当前正在使用的 Agent 会话，所以先在临时项目里验证（在临时目录运行 `memerig init`），再在本仓库使用。

想让本仓库的 CLI 全局可用：

```bash
pnpm install:global
```

它先构建 `packages/cli`，再在其目录内执行 `npm link`，于是 PATH 上的 `memerig` / `mrig` 指向本仓库。从仓库外部做普通全局安装行不通：`packages/cli` 依赖 `memerig-core: workspace:*`，只有 workspace 内能解析。symlink 被替换后重跑一次即可；链接状态下不要执行 `memerig upgrade`——它会用 registry 上的包覆盖这个 symlink。

## 许可证

MemeRig 使用 [GNU Affero General Public License v3.0](./LICENSE)，与 Trellis 相同。原 Trellis 版权声明和修改说明见 [COPYRIGHT](./COPYRIGHT)。
