# Add Project-Local Conventions

Often the user does not need to change MemeRig mechanics; they need local AI to understand their team's conventions. In that case, prefer `.memerig/spec/` or a project-local skill instead of editing `meta`.

## Where To Put Things

| Content type | Location |
| --- | --- |
| Rules code must follow | `.memerig/spec/<layer>/` |
| Cross-layer thinking methods | `.memerig/spec/guides/` |
| AI capability for a project-specific flow | Platform-local skill |
| One-off task material | `.memerig/tasks/<task>/` |
| Session summary | `.memerig/workspace/<developer>/journal-N.md` |

## Create A Project-Local Skill

If the user wants AI to know "how this project customizes MemeRig," create a local skill:

```text
.claude/skills/memerig-local/
└── SKILL.md
```

Example:

```md
---
name: memerig-local
description: "Project-local MemeRig customizations for this repository. Use when changing this project's MemeRig workflow, hooks, local agents, or team-specific conventions."
---

# MemeRig Local

## Local Scope

This skill documents this repository's MemeRig customizations only.

## Custom Workflow Rules

- ...

## Local Hook Changes

- ...

## Local Agent Changes

- ...
```

For multi-platform projects, place equivalent versions in other platform skill directories, or use `.agents/skills/` for platforms that support the shared layer.

## Write To `.memerig/spec/`

If the content is a coding convention, write it to spec. Examples:

```text
.memerig/spec/backend/error-handling.md
.memerig/spec/frontend/components.md
.memerig/spec/guides/cross-platform-thinking-guide.md
```

After writing it, update the corresponding `index.md` so AI can find the new rule from the entry point.

## Make The Current Task Use New Conventions

After writing a spec, add it to the current task context:

```bash
python3 ./.memerig/scripts/task.py add-context <task> implement ".memerig/spec/backend/error-handling.md" "Error handling conventions"
python3 ./.memerig/scripts/task.py add-context <task> check ".memerig/spec/backend/error-handling.md" "Review error handling"
```

## Do Not Store Project-Private Rules In `meta`

`meta` is a public skill for understanding MemeRig architecture and local customization entry points. Put project-private content in:

- `.memerig/spec/`
- a project-local skill
- the current task
- workspace journal

This prevents future updates to MemeRig's built-in `meta` from overwriting the team's own conventions.
