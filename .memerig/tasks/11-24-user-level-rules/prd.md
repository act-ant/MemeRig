# 支持用户级 Rules 注入

## Goal

允许用户在本地用户目录维护跨项目复用的 Rules，并由现有 SessionStart 上下文链路注入；仅 Rules 支持用户级，Spec、Tasks、Skills 不增加用户级来源。

## 已确认

- 用户级目录定为 `~/.memerig/rules/`，只扫描顶层 `*.md`，按文件名排序。
- 不使用手写 index；每个文件通过 YAML frontmatter 的 `load` 标注加载方式：
  - `load: always`：正文直接进入 SessionStart 上下文。
  - `load: index`（缺省）：只在上下文列出路径与标题，按适用性读取正文。
- 用户规则与项目规则是并列声明，不建立程序级优先级；语义冲突由使用者显式协调。
- 项目内 `.memerig/rules/` 的现有 index 路由机制不变。

## Requirements

- `get_context_text` / `get_context_json` 能发现并解析 `~/.memerig/rules/*.md`：
  - 仅处理普通文件；忽略非 `.md`、子目录与不可读文件。
  - 解析 frontmatter 的 `load`；缺失或未知值按 `index` 处理。
  - 标题取正文第一个 ATX `# ` 标题，缺失时退回文件名。
  - `always` 规则注入去除 frontmatter 后的正文；`index` 规则只列路径与标题。
- 用户规则路径必须出现在上下文文本中，便于 agent 直接读取；用户级规则不进入任务 `implement.jsonl` / `check.jsonl`。
- 路由说明同步到主会话入口与子代理入口：`AGENTS.md` 托管块、`workflow.md` Rules System、pull-based 子代理 prelude、`before-dev` / `check` / `start` 指南。
- `memerig init` / `update` / `uninstall` 不创建、不覆盖、不删除用户目录内容；用户文件完全由用户维护。
- 兼容无用户目录、空目录、损坏 frontmatter 与 Windows 路径。

## Acceptance Criteria

- [x] 临时 HOME 中写入 `always` 与 `index` 两类规则后，真实 `get_context.py` 输出按约定注入/索引，且顺序稳定。
- [x] 无 `~/.memerig/rules/` 时输出与当前行为一致，不出现空章节。
- [x] JSON 上下文包含结构化的 `userRules` 元数据；文本上下文包含可直接使用的绝对路径。
- [x] `load` 未知值、非 `.md` 文件、子目录均按文档约定处理。
- [x] 相关 CLI 测试与 lint/typecheck 通过；项目 Spec 与入口文档完成更新。

## Out of Scope

- 用户级 Spec / Tasks / Skills / Agents，或通用“用户层”抽象。
- Rules 安装、启停、优先级、冲突自动解决或用户规则管理命令。
- 修改 `.memerig/rules/index.md` 的既有采用与路由语义。
- 向用户目录写入模板、示例或迁移逻辑。

## References

- [Design](design.md)
- [Implementation plan](implement.md)
