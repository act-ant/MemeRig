# Start Session

Initialize a MemeRig-managed development session. This platform has no session-start hook, so manually load the equivalent compact context by following these steps.

---

## Step 1: Current state
Identity, git status, current task, active tasks, journal location.

```bash
{{PYTHON_CMD}} ./.memerig/scripts/get_context.py
```

If this output includes a line beginning `MemeRig update available:`, copy the full line verbatim when summarizing session context. Do not shorten operational command hints.

## Step 2: Workflow overview
Compact Phase Index, request triage rules, planning artifact contract, and the step-detail command.

```bash
{{PYTHON_CMD}} ./.memerig/scripts/get_context.py --mode phase
```

Full guide in `.memerig/workflow.md` (read on demand).

## Step 3: Guideline, spec-entry, and rule indexes
Discover packages + spec layers, then read each relevant index file.

```bash
{{PYTHON_CMD}} ./.memerig/scripts/get_context.py --mode packages
cat .memerig/spec/README.md                    # selected Spec template entry
cat .memerig/spec/index.md                     # project Spec map, when present
cat .memerig/spec/guides/index.md
cat .memerig/spec/<package>/<layer>/index.md   # for each relevant layer
cat .memerig/rules/index.md
cat .memerig/rules/<rule>.md                   # every applicable rule body; core.md always applies
```

The root Spec entry documents record the project-wide practices this template/project explicitly adopts and point to their bodies. Read the actual body of each adopted practice relevant to the current work — a link is not loaded content. Do not infer adoption from a file's name or presence, and do not treat an unadopted or partially authored practice as unfinished work.

Spec index files list the specific guideline docs to read when you actually start coding. Rules are constraints, not routes: open each body whose applicability covers the work. Do not assume a Markdown link was loaded, and do not load unadopted optional rules. User-level rules in `~/.memerig/rules/*.md` are personal rather than project adoptions: read every `load: always` body, and `load: index` rules when their applicability covers the work.

## Step 4: Decide next action
From Step 1 you know the current task and status. Check the task directory:

- **Active task status `planning` + no `prd.md`** → Phase 1.1. Load the `brainstorm` skill.
- **Active task status `planning` + `prd.md` exists** → stay in Phase 1. Lightweight tasks can be PRD-only; complex tasks need `design.md` + `implement.md`. Load the relevant Phase 1 step detail before `task.py start`.
- **Active task status `in_progress`** → Phase 2 step 2.1. Load the step detail:
  ```bash
  {{PYTHON_CMD}} ./.memerig/scripts/get_context.py --mode phase --step 2.1 --platform {{CLI_FLAG}}
  ```
- **No active task** → classify first. For simple conversation / small task, ask only whether this turn should create a MemeRig task. For complex work, ask whether you may create a MemeRig task and enter planning. If the user says no, skip MemeRig for this session.

---

## Skill routing (quick reference)

| User intent | Skill |
|---|---|
| New feature / unclear requirements | `brainstorm` |
| About to write code | `before-dev` |
| Done coding / quality check | `check` |
| Stuck / fixed same bug multiple times | `break-loop` |
| Learned something worth capturing | `update-spec` |

Full rules + anti-rationalization table in `.memerig/workflow.md`.
