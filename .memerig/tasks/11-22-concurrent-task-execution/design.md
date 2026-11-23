# 多会话多任务技术方案

## 已有基础

MemeRig 已用会话身份定位当前任务。`task.py finish` 清理当前会话绑定，`task.py complete` 按任务 ID 完成任务并清理其关联指针。仓库内任务协议已有存储写锁、原子替换及 `--expect-version`，可以防止任务记录被旧快照覆盖。现有 `task_queue.py` 提供筛选和统计。并发执行需要补充一份明确的运行所有权与结果协议。见 [任务协议](../../spec/cli/backend/task-protocol.md) 和 [工作流状态](../../spec/cli/backend/workflow-state-contract.md)。

## 数据定义

| 记录 | 落点 | 最小合同 |
| --- | --- | --- |
| Task | 现有 `task.json` v1 | 复用 `id`、`status`、`parentId`、`nextAction`。受管任务可用 MemeRig 自有命名空间记录当前待审 `runId`，旧任务读写照常 |
| Claim | 单一任务存储下的 `.memerig/.runtime/` | `taskId`、`runId`、`contextId`、`leaseExpiresAt`。一个 `taskId` 最多有一个有效实现领取。每次领取生成新 `runId`，所有续租和结算都核对当前领取 |
| Run receipt v1 | 任务目录 `runs/<runId>.json` | `schemaVersion`、`taskId`、`runId`、`sessionRef`、`outcome`、起止时间、提交引用、产物、验证记录。终态回执按 `runId` 幂等写入 |
| Review receipt v1 | 任务目录 `reviews/<reviewId>.json` | `schemaVersion`、`taskId`、`runId`、审查者、审查时间、`decision`、证据和验证结果。验收绑定具体运行和提交 |

回执字段使用 JSON Schema 校验，Python 写入层再校验跨记录的身份与状态，TypeScript 消费方通过合同样例验证兼容性。验证项至少区分 `passed`、`failed`、`not_run`。持有期限、绝对路径和本机执行进程信息属于运行时数据。交付证据使用提交 SHA、仓库相对路径、PR URL 或会话引用。回执记录沿用项目现有的任务版本控制策略。

## 执行与一致性

1. **定位任务存储。** 启动器传递可信的任务 owner 和 `taskId`，代码运行目录单独设为该任务的 Git worktree。入口校验运行目录属于 owner 对应的 Git 仓库，并保留模块 `task_owner` 解析规则。两个 worktree 内的 `.memerig` 不各自持有任务记录和锁。执行路径不得从共享任务列表猜当前任务。
2. **领取与启动。** 在任务存储锁内校验任务、现存领取和调用者提供的任务版本。持久化领取后释放锁，再创建或校验独立 worktree、绑定明确的 `contextId` 并启动 Agent。续租覆盖工作区初始化和运行阶段。初始化失败由同一领取者记录失败并释放，启动器崩溃则交给租约回收。实现进程本身不持有存储锁。
3. **隔离与回收。** 每次实现尝试使用自己拥有的 worktree 和分支。已过期运行可能仍在执行，回收后新运行使用新的工作区；启动器观察到失去领取后停止自己管理的子进程，旧运行不得写共享任务结果。保留仍有改动的工作区供检查。Git worktree 隔离 checkout，外部服务、端口和合并仍有各自的冲突边界。
4. **执行结算。** 由启动器根据实际退出结果写回执。校验 `runId` 后，在同一存储锁下按「写不可变回执 → 推进任务 → 释放领取」顺序执行，各文件原子替换。恢复时先检查是否已有对应回执，并在发出新领取前补齐同一次结算。重复提交相同内容返回已结算，冲突内容报错。成功执行进入 `review`；失败和中断保留原因并可重领。后续实现要覆盖回执已写、状态已写、领取尚未释放三个恢复边界。
5. **验收。** 审查者通过 `runId` 与提交引用定位交付，使用 `--expect-version` 校验审查期间任务未被改写。只有当前候选执行的验收通过且必跑验证齐全，才经现有生命周期写入层关闭受管任务。审查回执重复提交按同一规则恢复。受管任务的 `start`、`complete` 和通用状态更新入口共同执行领取和验收约束，避免旧命令绕过。既有未使用受管执行的任务保留手动关闭路径。

## 选型与接入边界

- **推荐，同机协调由仓库脚本完成。** 用现有存储锁保护短事务，复用会话绑定和任务状态机，加上独立 Git worktree、租约和回执。无需常驻调度服务。锁能保护同一个任务存储中的参与者，独立 clone 与跨机器并发须另有协调服务。
- **跨机器阶段评估 Vercel Board。** 当多个独立 Worker 确实需要共享待领取任务、依赖解锁或 Slack/GitHub 交接时，评估 Board 成为该队列唯一的领取仲裁者。维持 MemeRig 对任务需求与验收状态的写入权。用 `extensions` 存外部线程映射，用自定义版本化消息传递回执。明确 Board 的 `completed` 对应队列步骤完成，MemeRig 的 `completed` 对应验收完成。对同一队列只启用一种领取权威，并以任务 ID 和事件 ID 做幂等同步。参见 [Board 任务模型](https://vercel.com/docs/board/concepts/tasks) 和 [结构化消息介绍](https://vercel.com/blog/introducing-vercel-board)。
- **执行界面借鉴 Vibe Kanban。** 其 Workspace、Session 和执行进程拆分适合参考，Git diff、预览和 PR 审查可由工作台消费回执与工作区引用。参见 [公开数据模型](https://github.com/BloopAI/vibe-kanban/tree/main/crates/db/src/models)。

## 兼容与退出

受管执行按显式入口启用，沿用现有任务 Schema v1 和 UUID。切换前先盘点在途运行，停止领取并收尾或回收，再关闭受管入口。保留任务记录、运行和审查回执。重放和恢复须使用同一生命周期写入层。回退到常规手动流程前先解除在途领取并确认任务状态，已有证据继续可读。
