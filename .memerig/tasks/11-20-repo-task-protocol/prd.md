# 仓库内任务协议与收尾

## Goal

用基础 Python 脚本实现任务协议、接续、完成和旧数据迁移

## Requirements

- A checked-in Python standard-library entry point creates, reads, updates, and completes tasks without npm, hooks, or an active session identity.
- The stable task record has a versioned schema, durable identity, lifecycle state, collaboration fields, and an extension mechanism. Markdown remains available for requirements and evidence.
- Work can be resumed by ID after the original AI session ends. Completing a task is one operation and its location stays stable.
- Programmatic clients can read structured output and safely detect edits against a stale snapshot. Teams can use an external board through the protocol without requiring an external service for local use.
- Migrate existing active and archived tasks while preserving task relationships, documents, and legacy references that still matter.

## Acceptance Criteria

- [x] A fresh project can create a task, save a next action, resume by ID in another process, and complete it without a CLI install, network, or hook.
- [x] Completing twice leaves the same record and path. Completed tasks are listed separately and can still be found by ID.
- [x] Two writers using the same original snapshot cannot both silently overwrite the task.
- [x] Representative legacy records retain active and terminal state, hierarchy, and content after migration.
