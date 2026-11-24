# 可选 Rules 目录

Rule（规则）是简短的声明式约束，只有当项目条件符合且主动采用时才生效。本目录只是一个目录，不是活动规则集：在有人把文档复制到 `.memerig/rules/`、记录适用性，并写入任务上下文之前，这里的任何内容都不属于项目约束。

[English](./README.md) · [Marketplace 总览](../README.md)

## Rules 与 Spec 的区别

`.memerig/rules/` 和 `.memerig/spec/` 是并列的声明目录。它们复用同一套 Markdown 和任务上下文机制，但回答的问题不同：

| 目录 | 回答的问题 | 典型内容 | 归属 |
| --- | --- | --- | --- |
| `.memerig/rules/` | “这次工作应遵守哪些可复用约束？” | 适用条件、行为约束、可观察的合规证据 | `core.md` 和 `index.md` 作为默认文件交付；采用的可选文档归项目所有 |
| `.memerig/spec/` | “这个仓库实际如何运作？” | 包和分层约定、命令、架构、兼容性承诺、依赖策略 | 项目所有 |

目录划分只是语义区分，不是优先级顺序。Rule 不会自动覆盖 Spec、另一条 Rule 或项目已记录的决定，Spec 也不会自动抹掉 Rule。冲突必须明确协调并记录。

Rules 是声明，不是 Skill 或 Workflow。它们不定义工具调用顺序或执行步骤。需要流程时使用 Skill；TDD 仍然是已有的 workflow 选项，不要在这里再引入一个流程开关。

## 规则目录

| 规则 | 采用时机 | 文件 |
| --- | --- | --- |
| Clean cutover（干净切换） | 迁移消费者后，退役已明确指定的内部接口和兼容层 | [`clean-cutover.md`](./clean-cutover.md) |
| Production compatibility（生产兼容性） | 修改已发布的 API、CLI 契约、协议或持久化格式 | [`production-compatibility.md`](./production-compatibility.md) |
| Dependency governance（依赖治理） | 添加、删除或升级生产依赖，需要审批、许可证和安全约束 | [`dependency-governance.md`](./dependency-governance.md) |
| Architecture research（架构调研） | 重要且难以回退的设计选择需要记录对成熟方案的比较 | [`architecture-research.md`](./architecture-research.md) |

这四条都是可选的。只采用与项目匹配的规则，不要“以防万一”整包复制。

## 默认交付什么

正常的 MemeRig 模板流程会单独交付两个默认文件，与本目录无关：

- `.memerig/rules/index.md` —— 项目的 Rules 入口，列出 `core.md` 和项目已采用的规则。
- `.memerig/rules/core.md` —— 简短的默认基线，始终相关。

本目录的可选文档默认不会由 npm CLI 安装：`memerig init` 和 `memerig update` 都不会复制它们。它们没有登记在 `marketplace/index.json`，也没有安装参数或规则注册表。`memerig init --template` 仍然只用于项目 Spec 预设，不会安装这些声明。采用方式只能是下面的人工审阅复制。

## 用户级规则（个人规则，不属于项目采用）

跨项目的个人规则放在 `~/.memerig/rules/*.md`。它们不属于本目录，CLI 也不会安装或修改它们。每个文件可在 YAML frontmatter 中设置 `load`：

- `load: always` —— 正文注入会话与子代理上下文。
- `load: index` 或没有 frontmatter —— 只列出路径，按需读取。

用户级规则与项目规则并列，不是覆盖层。不要把用户级规则加入任务 manifest，也不要当作项目已采用的声明。

## 手动采用一条规则

采用是把内容审阅后复制进项目自有文件，不是安装。

1. **选择一条规则，并固定来源修订。** 使用 release tag 或完整 commit SHA，不要用会移动的分支。

   ```bash
   git clone https://github.com/blackplume233/MemeRig.git /tmp/memerig
   git -C /tmp/memerig checkout <release-tag-or-commit>
   ```

2. **复制前先检查目标文件。** 如果 `.memerig/rules/production-compatibility.md` 已存在，先停下并有意合并。重新采用和升级都是审阅后的合并，不是覆盖复制。

3. **只复制选中的文档，并带上防覆盖检查。** 不要复制本指南或未选中的规则。下面的命令在目标已存在时会失败，而不是替换文件。

   ```bash
   if test -e .memerig/rules/production-compatibility.md; then
     echo "Already exists: merge deliberately instead of overwriting." >&2
     false
   else
     mkdir -p .memerig/rules
     cp /tmp/memerig/marketplace/rules/production-compatibility.md .memerig/rules/
   fi
   ```

   PowerShell：

   ```powershell
   $target = '.memerig\rules\production-compatibility.md'
   if (Test-Path $target) { throw "Already exists: merge deliberately instead of overwriting." }
   New-Item -ItemType Directory -Force .memerig\rules | Out-Null
   Copy-Item C:\temp\memerig\marketplace\rules\production-compatibility.md $target
   ```

4. **记录来源和版本。** 保留文档的 `Provenance` 部分，并在文件顶部或索引里写一条普通说明：

   ```markdown
   Adopted from MemeRig `marketplace/rules/production-compatibility.md` at `<release-tag-or-commit>`.
   ```

5. **调整适用范围，不要删掉保障。** 修改 `Applies to` 和范围示例，写明项目真实的服务、包、接口和环境。如果某条约束确实无法满足，记录例外和原因；不要删掉约束，留下看起来干净实则失效的规则。

6. **把规则加入项目的 Rules 索引。** 用相对链接指向正文并写明适用性，不要把正文粘进索引。

   ```markdown
   - [Production compatibility](./production-compatibility.md) — public HTTP API and the CLI's JSON output
   ```

7. **把精确文件写入任务清单。** implement 和 check 子 Agent 会收到 `implement.jsonl` 与 `check.jsonl` 中列出的文件。加入规则正文本身，而不只是索引：

   ```bash
   python3 .memerig/scripts/task.py add-context <task> implement .memerig/rules/production-compatibility.md "compatibility window for the public API"
   python3 .memerig/scripts/task.py add-context <task> check     .memerig/rules/production-compatibility.md "verify the public API compatibility window"
   ```

   `<task>` 可以是任务名或 `.memerig/tasks/<dir>`。请使用项目实际可用的 Python 3 命令：macOS/Linux 通常是 `python3`，Windows 通常是 `python`（也可用 `py -3`），或用 `MEMERIG_PYTHON_CMD` 覆盖。MemeRig 生成的平台指令会显示与宿主匹配的命令，照那里的写法执行。

8. **先验证，再提交项目实际跟踪的内容。** 运行：

   ```bash
   python3 .memerig/scripts/task.py validate <task>
   ```

   然后提交采用的规则和它在 `rules/index.md` 中的条目。只有当 `.memerig/tasks/` 受版本跟踪时，才提交 `implement.jsonl` 和 `check.jsonl`；任务目录可能是本地或 gitignored，按项目的任务策略处理。

## 规则如何到达 Agent

不存在启用/停用状态。规则能作用于工作，是因为文档已存在、在 `.memerig/rules/index.md` 中被链接，并列入了相关任务清单；索引不是“停用规则”的注册表。

- **主会话。** 受管入口指令会指向 `.memerig/rules/index.md`。索引只是导航：主会话读取索引后，还要打开本轮适用的每个规则正文。
- **子 Agent。** implement/check 钩子会注入任务 JSONL 清单中列出的文件，不会展开 Markdown 链接。只列 `.memerig/rules/index.md` 不会把正文交给子 Agent；需要哪个角色遵守，就把精确的 `.memerig/rules/<id>.md` 写进那个角色的清单。

采用本身不能证明所有宿主加载相同上下文。如果某个平台不运行钩子，要实际确认它注入了什么，并添加项目自有指令，让它的主会话读取索引和选中的规则正文。

## 冲突与范围

Rules 和 Spec 没有全局优先级。冲突边界必须明确决定，并写进本轮工作能看到的地方：任务 `design.md`、项目 Spec，或索引条目旁的适用性说明。

- **Clean cutover 与 Production compatibility。** 内部序列化兼容层可以在消费者迁移后立即删除；同一个改动想删除的已发布响应字段则要保留支持窗口、提供迁移路径，并按明确时间表移除。边界是接口的受众，不是仓库或开发者偏好。
- **Architecture research 与“最简够用”基线。** 选一个日期格式化辅助函数不需要设计调研；选主数据库或消息总线则需要。调研义务只用于重要且难以回退的选择，选定方案内部仍然遵循最简够用。
- **Dependency governance 与 Production compatibility。** 安全升级可以加速，但仍要针对它改变的公共契约做明确的兼容性决定。“安全”不会静默豁免支持窗口，“兼容”也不会静默阻止关键补丁。

如果找不到诚实的边界，就收窄或放弃其中一条规则。不要声称两条都适用，却在评审时挑方便的那条。

## 更新与移除

**更新。** 把记录的来源修订与新目录版本比较，阅读 diff，只移植适合项目的改动。保留本地的适用性修改和范围说明。目录更新不是订阅：`memerig update` 和 Marketplace 都不会自动修改已采用的文档。`memerig update` 把 `core.md` 和 `index.md` 当作受管的默认文件。如果你在 `index.md` 里加入了已采用规则的链接，更新会把这个文件视为本地修改，并走现有的冲突流程：保留你的版本（跳过），或把上游默认内容保存为 `.new` 审阅副本。`--force` 选择覆盖，可能替换你改过的 `core.md` 或 `index.md`，使用前先确认。手动采用的文档不会作为内置模板收集。

```bash
git -C /tmp/memerig fetch --tags
git -C /tmp/memerig diff <recorded-revision> <new-revision> -- marketplace/rules/production-compatibility.md
```

**移除。** 同时删除已采用的文档、它在索引中的链接和适用性说明，以及它在活动 `implement.jsonl`、`check.jsonl` 中的条目。对受影响任务重新运行 `task.py validate`。移除是一次普通的审阅改动，不是开关。移除规则绝不授权删除数据、丢弃持久化契约或回退无关的项目改动。

## 来源与署名

这些规则受一条公开帖子启发：<https://x.com/murong97358/status/2124531122826854873>。

该帖描述的是 side project 偏好，并警告其兼容性建议险些造成破坏性的数据库变更。MemeRig 不采用其中的绝对化表述；本目录把它们收窄为有明确取舍的范围化决定。MemeRig 没有独立核实作者身份、token 消耗说法或帖中描述的事故。该帖只是讨论来源，未确认存在允许复用的许可证：每个规则文件都是 MemeRig 原创文本，不是翻译或逐字复制。MemeRig 仓库（包括本目录）以 AGPL-3.0 分发；见仓库 [`COPYRIGHT`](../../COPYRIGHT) 和 [`LICENSE`](../../LICENSE)。

默认 `core.md` 基线与本目录分开编写和维护。它的存在不代表这里任何可选规则已被采用。
