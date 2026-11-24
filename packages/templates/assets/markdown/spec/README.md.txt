# Project spec

This directory is the source of truth for how code in this repository is
written. MemeRig loads files from here into the sub-agents that implement and
check each task, so what is written here is what gets followed.

It starts empty on purpose: there is nothing to fill in or delete. Add the
documents this project actually needs, as the conventions become real.

## Suggested layout

```
.memerig/spec/
  index.md                      # optional: map of the spec, read first
  <package>/<layer>/index.md     # entry point for one package + layer
  <package>/<layer>/<topic>.md    # one document per convention
  guides/index.md                # cross-package thinking guides
```

A single-package repository can drop the `<package>` level
(`.memerig/spec/backend/…`). The layer names and topic names are yours —
they only need to match what `task.py add-context` and the sub-agent manifests
reference.

## What belongs in a layer `index.md`

- A **Pre-Development Checklist** — what to read/decide before writing code.
- The rules themselves, each as a short actionable statement, with the
  path of the document that carries the detail.
- A **Quality Check** — what a reviewer must verify before the task is done.

## How to fill it honestly

1. Import existing convention docs first (`AGENTS.md`, `CLAUDE.md`,
   `.cursorrules`, `.github/copilot-instructions.md`, `CONTRIBUTING.md`,
   `.editorconfig`, …).
2. Analyze the codebase for anything those files miss: find two or three real
   examples of each pattern and reference real paths.
3. Document what the code **does**, not what it should do. Sub-agents match the
   spec, so aspirational rules produce code that looks out of place. Tech debt
   is documented as-is; fixing it is a separate conversation.

## Wiring a spec file into tasks

```
python ./.memerig/scripts/task.py add-context <task> implement .memerig/spec/<path>.md "<why>"
python ./.memerig/scripts/task.py add-context <task> check     .memerig/spec/<path>.md "<why>"
```

Only spec, rule, and research documents belong in those manifests — never code paths. Rule documents are the adopted files under `.memerig/rules/`, not the optional catalog.
