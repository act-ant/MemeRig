# MemeRig 自举与仓库内工作流

## Goal

以仓库内脚本实现任务协议，发布初始模板，简化初始化并支持本机跨项目发现

## Requirements

- MemeRig manages its own day-to-day iteration through the files and scripts checked into the repository. A collaborator with Python can use them immediately after cloning, without installing the MemeRig CLI or configuring an AI platform.
- Tasks have a machine-readable contract, persist during work, and can be completed through one operation. Interfaces and optional external boards can use the same contract.
- The default setup provides a blank spec. Learn Harness, Trellis, and Game Dev are explicit built-in options. Maintainers have a documented publication and adoption path.
- Initial setup stays light. Projects choose whether to track tasks. Submodules may hold only key local configuration. Cross-project discovery is a local opt-in.

## Acceptance Criteria

- [x] In a clean MemeRig clone with the proposed runtime applied, two simulated collaborators used the checked-in scripts to create, resume, and close a task. Its files remained visible for Git review.
- [x] Offline initialization works for the blank default and all three presets. Marketplace entries source the same template content as the offline distribution.
- [x] A fresh project works with hooks disabled and without a user-level directory. With discovery enabled, multiple checkouts resolve to one project without copying task or memory content to the user directory.

## Child tasks

- [Repository task protocol](../11-20-repo-task-protocol/prd.md)
- [Starter templates and Marketplace publication](../11-20-starter-template-release/prd.md)
- [Lightweight setup and project discovery](../11-20-lightweight-project-discovery/prd.md)
