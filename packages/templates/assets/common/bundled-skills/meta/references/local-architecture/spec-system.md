# Local Spec System

`.memerig/spec/` is the user's project-specific engineering spec library. MemeRig is not about making AI memorize conventions; it injects relevant specs or requires the AI to read them at the right time.

## Directory Model

A common single-repository structure:

```text
.memerig/spec/
├── backend/
│   ├── index.md
│   └── ...
├── frontend/
│   ├── index.md
│   └── ...
└── guides/
    ├── index.md
    └── ...
```

A common monorepo structure:

```text
.memerig/spec/
├── cli/
│   ├── backend/
│   │   ├── index.md
│   │   └── ...
│   └── unit-test/
│       ├── index.md
│       └── ...
├── docs-site/
│   └── docs/
│       ├── index.md
│       └── ...
└── guides/
    ├── index.md
    └── ...
```

`index.md` is the entry point for each layer. It should list the Pre-Development Checklist and Quality Check. Specific guidelines live in other Markdown files in the same directory.

## Special Spec: Repository Attractor (Optional)

The default Spec guidance template adopts the repository-attractor method.
Other templates may adopt it, use their own method, or omit the concept
entirely.

When adopted:

- `.memerig/attractor-guide.md` is the installed default construction method.
  Its presence does not activate anything.
- `.memerig/spec/attractor.md` is the project-owned desired-direction document.
  Create it only when there is meaningful confirmed direction or concrete
  exploration, never as an empty scaffold.
- The root file is project-wide direction, separate from package/layer code
  contracts. It is not a config flag, task list, or parser input.
- Reuse the task JSONL manifests to load the actual file when a task needs it.
  A link in a README or index is not loaded content.
- A template that is silent or declines the capability gets no attractor
  questions, project documents, warnings, tasks, or completion gates. An
  existing attractor left from an earlier adoption is preserved but does not
  reactivate it.

Selected preset templates keep their own README and adoption choice. Do not
layer the default Spec README's adoption onto a preset.

## Package Configuration

`.memerig/config.yaml` can declare packages:

```yaml
packages:
  cli:
    path: packages/cli
  docs-site:
    path: docs-site
    type: submodule
default_package: cli
```

The AI can run:

```bash
python3 ./.memerig/scripts/get_context.py --mode packages
```

This command lists packages and spec layers for the current project. Use this output as the reference when configuring context JSONL.

## How Specs Enter Tasks

Before a task enters implementation, planning may write relevant specs into `implement.jsonl` / `check.jsonl` when the task needs spec or research context beyond the task artifacts:

```jsonl
{"file": ".memerig/spec/cli/backend/index.md", "reason": "CLI backend conventions"}
{"file": ".memerig/spec/cli/unit-test/conventions.md", "reason": "Test expectations"}
```

Sub-agents or platform preludes read these JSONL files and load the referenced specs. On platforms without sub-agent support, the AI should read the relevant specs directly according to the workflow.

## What Specs Should Contain

Specs should contain executable engineering conventions for the project, not generic best practices:

- Where files should live.
- How error handling should be expressed.
- Input/output contracts for APIs, hooks, and commands.
- Patterns that are forbidden.
- Cases that require tests.
- Project-specific pitfalls and how to avoid them.

Code specs describe what the implementation relies on now. If the project
adopts the attractor method, put desired future properties in
`.memerig/spec/attractor.md`, not here; current behavior and desired direction
must remain distinguishable.

When the AI learns a new rule during implementation or debugging, it should update `.memerig/spec/` rather than only summarizing it in chat.

## Local Customization Points

| Need | Edit location |
| --- | --- |
| Add a new spec layer | `.memerig/spec/<package>/<layer>/index.md` and corresponding guideline files. |
| Change monorepo spec mapping | `packages` / `default_package` / `spec_scope` in `.memerig/config.yaml`. |
| Change which specs AI reads before implementation | The task's `implement.jsonl`. |
| Change which specs AI reads during checking | The task's `check.jsonl`. |
| Change when specs should be updated | Phase 3.3 in `.memerig/workflow.md` and the `update-spec` skill. |

## Boundaries

`.memerig/spec/` is the user's project specification, not a permanent copy of MemeRig built-in templates. The AI should encourage the user to update it according to the actual project code instead of treating MemeRig default templates as immutable documents.
