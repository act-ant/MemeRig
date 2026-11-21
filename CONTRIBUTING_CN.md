# 贡献指南

感谢你对 MemeRig 的关注！本文档提供参与项目贡献的指南。

## 贡献方式

### 报告 Bug

提交 Bug 前，请先查看 [已有 Issues](https://github.com/blackplume233/MemeRig/issues) 避免重复。

报告 Bug 时请包含：
- MemeRig 版本 (`memerig --version`)
- Node.js 版本 (`node --version`)
- 操作系统
- 复现步骤
- 预期行为 vs 实际行为
- 相关日志或截图

### 功能建议

欢迎提交功能请求！请开一个 Issue 并包含：
- 功能的清晰描述
- 使用场景 / 解决的问题
- 实现思路（可选）

### 改进文档

文档改进永远受欢迎：
- 修复错别字或表述不清的地方
- 添加示例
- 改进 README 或指南文档

### 贡献代码

欢迎以下类型的代码贡献：
- Bug 修复
- 新功能（请先在 Issue 中讨论）
- 性能优化
- 测试覆盖

## 开发环境设置

### 从干净克隆接手任务

仓库已包含任务工具。日常任务只需 Python 3.9+。如果系统使用 `python3`，请替换下面的命令名。

```bash
python .memerig/scripts/task.py list
python .memerig/scripts/task.py create "完善初始化指南" --description "补充离线初始化说明" --json
python .memerig/scripts/task.py show <task-id> --json
python .memerig/scripts/task.py start <task-id>
python .memerig/scripts/task.py complete <task-id>
```

在 `prd.md` 记录需求和验证结果，通过 Git 评审共享任务文件。任务完成后路径保持不变。外部程序可运行 `task.py schema --json` 获取任务结构，把 `show --json` 返回的版本标记传给 `update --expect-version`，避免覆盖别人的更新。

维护者可用 `memerig init --tasks tracked` 初始化团队项目。直接运行 `memerig init` 会安装空白配置，任务默认保存在本地。团队需要平台集成时，通过相应参数开启。离线模板、固定 Git 版本和发布方式见 [Marketplace 指南](marketplace/README.md)。

```bash
python .memerig/scripts/project.py doctor
python .memerig/scripts/project.py configure --tasks tracked
python .memerig/scripts/project.py register
python .memerig/scripts/project.py list
```

首次登记会创建 `~/.memerig/projects.json`，仅保存本机用户 ID 和按项目 ID 归组的检出路径。任务与会话内容保留在原位置。`memerig mem projects --registered` 按登记的项目汇总会话。子模块可在自己的 `.memerig/config.yaml` 设置 `task_owner: parent`，并从子模块目录调用父级任务脚本。

### 前置要求

- Node.js 18.0.0+
- pnpm
- Python 3（用于 hooks）
- Bash（用于脚本）

### 开始开发

1. **Fork 仓库** 到你的 GitHub 账号

2. **克隆你的 Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/MemeRig.git
   cd MemeRig
   ```

3. **安装依赖**
   ```bash
   pnpm install
   ```

4. **构建项目**
   ```bash
   pnpm build
   ```

### 运行检查

```bash
pnpm lint        # TypeScript ESLint 检查
pnpm lint:py     # Python 类型检查 (basedpyright)
pnpm lint:all    # 同时运行以上两者
pnpm typecheck   # TypeScript 类型检查
```

> **注意：** 提交时 pre-commit hook 会自动对暂存的 `.ts` 文件运行 `eslint --fix` 和 `prettier --write`。

## 项目结构

```
MemeRig/
├── src/                    # TypeScript 源代码
│   ├── cli/                # CLI 入口
│   ├── commands/           # CLI 命令 (init, update)
│   ├── configurators/      # 模板应用逻辑
│   ├── templates/          # 安装到用户项目的模板 ←
│   └── utils/              # 工具函数
├── .claude/                # Claude Code 配置（项目自用）←
│   ├── agents/             # Agent 定义
│   ├── commands/           # 斜杠命令
│   └── hooks/              # Python Hook 脚本
├── .memerig/               # MemeRig 工作流（项目自用）←
│   ├── scripts/            # Bash 脚本
│   └── spec/               # Spec 文件模板
└── docs/                   # 文档
```

> **重要：** 修改 `.claude/`、`.memerig/` 或 `.cursor/` 时，请检查是否需要同步更新 `src/templates/`。项目使用自己的配置文件，但模板才是安装到用户项目的内容。

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
type(scope): description
```

**类型：**
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档变更
- `refactor` - 代码重构
- `test` - 添加或更新测试
- `chore` - 维护任务

**示例：**
```
feat(cli): add --dry-run flag to init command
fix(hooks): resolve context injection for nested tasks
docs(readme): update quick start instructions
```

## Pull Request 流程

1. **从 `main` 创建分支**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **进行修改**，遵循提交规范

3. **确保检查通过**
   ```bash
   pnpm lint && pnpm typecheck
   ```

4. **推送到你的 Fork**
   ```bash
   git push origin feat/your-feature-name
   ```

5. **向 `main` 分支发起 Pull Request**
   - 提供清晰的变更描述
   - 关联相关 Issue
   - UI 变更请附截图

6. **根据反馈进行修改**

## 感谢

每一份贡献都让 MemeRig 变得更好。感谢你的付出！
