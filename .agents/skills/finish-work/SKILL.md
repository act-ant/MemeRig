---
name: finish-work
description: "Complete the active task and record the session journal after verification and code commits."
---

# Finish Work

Wrap up the current session by completing the active task in place and recording the session journal. Commit the code in workflow Phase 3.4 before invoking this command.

Use `python` on Windows and `python3` elsewhere for the commands below.

## Step 1: Survey current state

```bash
python3 ./.memerig/scripts/get_context.py --mode record
```

This prints:

- **My active tasks** — identify the current task. If session identity is unavailable, use the task already identified in this conversation.
- **Git status** — quick visual on what's dirty.
- **Recent commits** — you'll need their hashes in Step 4 for `--commit`.

## Step 2: Sanity check — classify dirty paths

Run:

```bash
git status --porcelain
```

Filter out paths under `.memerig/workspace/` and `.memerig/tasks/`. Journal and task records are handled separately from code changes.

For each remaining dirty path, decide whether it belongs to **the current task** or to **other parallel work** (e.g., another terminal window editing the same repo). Heuristics:

- Paths referenced in the current task's `prd.md` / `implement.jsonl` / `check.jsonl` → current task
- Paths in code areas matching the task's stated scope, or that you remember editing this session → current task
- Paths in unrelated areas you have no recollection of touching this session → other parallel work

Then route:

- **Any remaining path looks like current-task work** — bail out with:
  > "Working tree has uncommitted code changes from this task: `<list>`. Return to workflow Phase 3.4 to commit them before running ``finish-work` (MemeRig command)`."

  Do NOT run `git commit` here. Do NOT prompt the user to commit. The user goes back to Phase 3.4 and the AI drives the batched commit there.
- **All remaining paths look unrelated** (other parallel-window work) — report them once and continue to Step 3:
  > "FYI, dirty files outside this task's scope — leaving them for the other window: `<list>`."
- **Genuinely unsure** — ask the user once: "Are `<list>` this task's work I forgot to commit, or another window's? (commit / ignore)" — then route per their answer.

## Step 3: Complete the current task

```bash
python3 ./.memerig/scripts/task.py complete <task-id>
```

Use the task UUID or path. Completion records the status at the existing path, clears matching session pointers, and makes no Git commit. If the project tracks tasks, include the completion record in Git review. Skip this step if the session has no task.

## Step 4: Record session journal

```bash
python3 ./.memerig/scripts/add_session.py \
  --title "Session Title" \
  --commit "hash1,hash2" \
  --summary "Brief summary"
```

Use the work-commit hashes produced in Phase 3.4 (visible in Step 1's Recent commits list or via `git log --oneline`). Journal commits follow the project's `session_auto_commit` setting.
