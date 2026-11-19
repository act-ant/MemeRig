# MemeRig on DeepSeek Harness (dsh)

dsh is a **class-2 pull-based** MemeRig host: no session-start hook auto-injects
workflow context, so the agent loads the MemeRig skills on demand through its
skill-loader tool.

| Capability | Status |
| --- | --- |
| Skills (`.agents/skills/<name>/SKILL.md`) | Works — dsh discovers this shared root natively |
| Entry skills (`.dsh/skills/<name>/SKILL.md`) | Works — dsh's own project skill root (highest rank) |
| Context hooks | None — pull-based: skills read `.memerig/` files directly |
| Sub-agents | None shipped — implement/check/research run inline via the workflow skills |

## Quick start

```bash
memerig init --dsh -u your-name
dsh web        # or: dsh --profile headless "start a MemeRig task for ..."
```

In dsh:

1. Open a session in the project root and describe the work in natural
   language. For a new task the agent should load the `start` skill,
   which reads the current task state from `.memerig/` and routes to
   `brainstorm` (unclear requirements), `before-dev` (about to
   write code), `check` (done coding), or `update-spec`
   (learned something worth capturing).
2. Entry skills are `start` / `continue` / `finish-work`
   in `.dsh/skills/`. You can also ask for them by name at any time.
3. Type `/memerig:finish-work` is a slash-command convention from other hosts —
   dsh has no slash palette, so say "finish the memerig task" instead, and the
   agent loads `finish-work`.

## File map

- `.agents/skills/` — auto-triggered workflow skills (`before-dev`,
  `brainstorm`, `check`, `break-loop`,
  `update-spec`) plus the bundled `meta` /
  `spec-bootstrap` / `session-insight` skills. Byte-identical
  to Codex / Gemini CLI / Pi / Kimi writes into the same shared root.
- `.dsh/skills/` — dsh-private entry skills (`start` /
  `continue` / `finish-work`).
- `.memerig/` — specs, tasks, workspace memory, and the shared scripts the
  skills invoke (`get_context.py`, `task.py`, ...).

## Notes

- Skill scripts pass `--platform dsh` to `get_context.py`; the value is used
  as a platform-scoped context key.
- The shipped `minimal` agent preset composes only `bash` +
  `str_replace_editor`; the default presets include `web_search` and the
  filesystem/terminal tools the skills assume.
- dsh has no project-level sub-agent definition surface, so MemeRig ships no
  `memerig-implement` / `memerig-check` / `memerig-research` agent prompts
  here — the workflow skills run those phases inline in the main session.
