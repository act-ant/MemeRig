# Change Local Skills, Commands, Prompts, And Workflows

When the user wants to change AI entry points, auto-trigger rules, or explicit command behavior, edit skills, commands, prompts, or workflows in local platform directories.

Before editing, classify the skill you are about to touch:

- **Bundled upstream skill** — `meta`, `spec-bootstrap`, `session-insight`, `channel`, `attractor`. Source of truth lives in the MemeRig CLI repo under `packages/templates/assets/common/bundled-skills/<name>/`; auto-dispatched to every platform's skill root by `getBundledSkillTemplates()` on `memerig init` / `memerig update`. Local edits here are tracked by `.memerig/.template-hashes.json` and will be flagged on the next update. Installation is not adoption: the `attractor` skill applies only when the selected project/template adopts construction or the user explicitly asks for it.
- **Project-local skill** — anything else under `.{platform}/skills/`. Owned by the user; not refreshed by `memerig update`.

The remainder of this file uses "skill" for the local file; the override and conflict rules differ between the two cases.

## Read These Files First

1. `.memerig/workflow.md`
2. Target platform skill/command/prompt/workflow directory
3. Related agent or hook files
4. Whether project rules already exist in `.memerig/spec/`
5. `.memerig/.template-hashes.json` — confirms whether the skill you are about to edit is upstream-owned (entry present) or project-local (entry absent)

## Which Entry Type To Choose

| Goal | Recommendation |
| --- | --- |
| AI should automatically know a capability | Add or modify a skill. |
| User wants to trigger manually with a command | Add or modify a command/prompt/workflow. |
| Team project conventions | Prefer `.memerig/spec/` or a project-local skill — never a bundled skill directory. |
| Tweak a bundled skill (`meta` et al.) for the user's own project | Create a project-local sibling skill (different name) that overrides intent, or edit `.memerig/spec/`. Edits inside the bundled skill directory survive only until the next `memerig update` and will need a "keep" choice each time. |
| Contribute the change back upstream | Edit `packages/templates/assets/common/bundled-skills/<name>/` in the MemeRig CLI repo, not the deployed copy. |
| Change MemeRig flow semantics | Synchronize `.memerig/workflow.md`. |

## Modify A Skill

A skill is usually:

```text
<skill-name>/
├── SKILL.md
└── references/
```

`SKILL.md` should be short and responsible for triggering/routing. Put long content in `references/` so AI can read it on demand.

The frontmatter description should specify when to use the skill. Example:

```yaml
description: "Use when customizing this project's deployment workflow and release checklist."
```

Do not write vague descriptions such as "helpful project skill"; they can trigger incorrectly.

### Bundled vs. Project-Local

The same directory shape is used by two very different ownership models:

| Aspect | Bundled (`meta`, `spec-bootstrap`, `session-insight`, `channel`, `attractor`) | Project-local |
| --- | --- | --- |
| Source of truth | `packages/templates/assets/common/bundled-skills/<name>/` in MemeRig CLI repo | Inside the user project itself |
| Dispatch | Auto-dispatched to every platform skill root by `getBundledSkillTemplates()` (`packages/cli/src/templates/common/index.ts`) on `memerig init` / `memerig update` | Created by the user (or another skill) and never moved |
| Hash tracking | Every file recorded in `.memerig/.template-hashes.json`; conflict prompt on update | Not tracked |
| Editing locally | Allowed but will be marked "modified by user" on next update | Free editing |
| The right way to customize | Add a *new* project-local skill with a *different* name that supplements (or supersedes) the bundled one | Edit the file directly |

If the goal is "make my project's AI behave differently when discussing release notes," the answer is almost always a project-local skill, not surgery on `meta/`.

## Modify A Command/Prompt/Workflow

Explicit entry points should state:

- How the user triggers it.
- Which `.memerig/` files to read.
- Which scripts to run.
- How to report after completion.

If a command only repeats workflow rules, prefer making it reference/read `.memerig/workflow.md` instead of maintaining a second copy of the flow.

## Common Paths

| Platform | Entry directories |
| --- | --- |
| Claude Code | `.claude/skills/`, `.claude/commands/` |
| Cursor | `.cursor/skills/`, `.cursor/commands/` |
| OpenCode | `.opencode/skills/`, `.opencode/commands/` |
| Codex | `.agents/skills/`, `.codex/skills/` |
| Gemini CLI | `.agents/skills/`, `.gemini/commands/` |
| Kiro | `.kiro/skills/` |
| Qoder | `.qoder/skills/`, `.qoder/commands/` |
| CodeBuddy | `.codebuddy/skills/`, `.codebuddy/commands/` |
| GitHub Copilot | `.github/skills/`, `.github/prompts/` |
| Factory Droid | `.factory/skills/`, `.factory/commands/` |
| Pi Agent | `.agents/skills/` |
| Reasonix | `.reasonix/skills/` (no separate commands dir; slash commands built into the platform) |
| ZCode | `.zcode/skills/`, `.zcode/commands/` |
| Kilo / Antigravity / Devin | workflows + skills |

Every directory above is a deploy target for the five bundled skills. Each platform receives a full copy on `memerig init` and refresh on `memerig update`; nothing has to be wired by hand.

## Add A Project-Local Skill

If the user wants to document team-private customizations, create a project-local skill — never put project-private content into a bundled skill directory, since `memerig update` will overwrite it.

```text
.claude/skills/project-memerig-local/
└── SKILL.md
```

For multi-platform projects, add equivalent versions in each platform skill directory, or use `.agents/skills/` on platforms that support the shared layer (Codex, Gemini CLI).

Pick a name that does **not** collide with the bundled set:

- `meta`
- `spec-bootstrap`
- `session-insight`
- `channel`
- `attractor`

A reused name causes `getBundledSkillTemplates()` to overwrite the project-local copy on the next update. A common convention is to prefix the project name: `acme-memerig-deploy`, `acme-memerig-onboarding`.

## Notes

- Do not mix every platform's syntax into one file.
- Do not change only one platform entry point while claiming all platforms are supported.
- Do not hide long-term engineering conventions inside a command; write them to `.memerig/spec/`.
- Do not hand-edit files inside `meta/`, `spec-bootstrap/`, `session-insight/`, `channel/`, or `attractor/` under any `.{platform}/skills/` directory expecting the change to persist — they are bundled and refreshed by `memerig update`. Either contribute upstream or add a project-local skill that complements them.
- Treat an installed `attractor` skill or an existing `.memerig/spec/attractor.md` as available content, not as proof that the project adopted attractor construction.
- After `memerig update` reports a "modified by you" conflict on a bundled skill file, choose **keep** only if you accept maintaining the divergence by hand; otherwise accept the overwrite and re-apply the intent as a project-local skill.
