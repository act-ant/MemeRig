# 轻量初始化与跨项目感知

## Goal

精简 onboarding 和 hooks，定义任务 Git 策略、子模块配置和本机项目发现

## Requirements

- A collaborator can use a clean clone with no global setup or mandatory platform hook. Initialization avoids bootstrap and joiner tasks by default.
- Users can opt into cross-project discovery through a small, user-local catalog. A project has a stable ID across checkouts. Repository content stays in its projects.
- Provide a configurable task Git policy. Runtime state and user-local identity are always personal. Preserve the tracked state of existing projects during upgrades.
- Support submodule-local key configuration and explicit parent ownership or independent project ownership. Surface the effective configuration and owner when diagnosing setup.

## Acceptance Criteria

- [x] An unregistered project can run the normal task flow without a global directory or platform session ID.
- [x] Two checkouts with the same project ID appear under one logical project on an opted-in machine. Unregistered projects are excluded and stale paths can be removed.
- [x] Local and tracked task policies behave as documented. Switching settings never silently unstages or deletes tracked data.
- [x] Inherited and independent module fixtures resolve distinct task stores. Platform setup and repository-local operations have separate verification.
