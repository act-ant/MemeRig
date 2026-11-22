<!-- MEMERIG:START -->
# MemeRig Instructions

These instructions are for AI assistants working in this project.

This project is managed by MemeRig. The working knowledge you need lives under `.memerig/`:

- `.memerig/workflow.md` — development phases, when to create tasks, skill routing
- `.memerig/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.memerig/workspace/` — per-developer journals and session traces
- `.memerig/tasks/` — active and archived tasks (PRDs, research, jsonl context)

- List shared work with `python .memerig/scripts/task.py list`. Use the name of your Python 3 executable.
- Resume by task ID and update the task as you work. After verifying the result, run `python .memerig/scripts/task.py complete <id>`.
- Inspect effective project configuration with `python .memerig/scripts/project.py doctor`.

Platform integrations can supply additional context. The repository scripts are usable directly.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable MemeRig skills
- `.codex/agents/` — optional custom subagents

Managed by MemeRig. Edits outside this block are preserved; edits inside may be overwritten by a future `memerig update`.

<!-- MEMERIG:END -->
