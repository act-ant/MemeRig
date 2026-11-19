# How To: Add Slash Command

Add a new `/memerig:my-command` command.

**Platform**: All (11 platforms — each has its own command format)

---

## Files to Modify

| File                                     | Action | Required |
| ---------------------------------------- | ------ | -------- |
| `.claude/commands/memerig/my-command.md` | Create | Yes      |
| `.cursor/commands/my-command.md`         | Create | Optional |
| `memerig-local/SKILL.md`                 | Update | Yes      |

---

## Step 1: Create Command File

Create `.claude/commands/memerig/my-command.md`:

```markdown
---
name: my-command
description: Short description of what the command does
---

# My Command

## Purpose

Detailed description of the command's purpose.

## When to Use

- Scenario 1
- Scenario 2

## Workflow

1. First step
2. Second step
3. Third step

## Output

What the command produces.
```

### Command Name Convention

- Use kebab-case: `my-command`, not `myCommand`
- Prefix with category if needed: `check-backend`, `before-frontend-dev`

---

## Step 2: Mirror to Other Platforms (Optional)

Commands are automatically mirrored to configured platforms by `memerig init` and `memerig update`. Each platform uses its own format:

| Platform    | Path                                            | Format   |
| ----------- | ----------------------------------------------- | -------- |
| Cursor      | `.cursor/commands/memerig-my-command.md`        | Markdown |
| OpenCode    | `.opencode/agents/memerig-my-command.md`        | Markdown |
| iFlow       | `.iflow/commands/memerig/my-command.md`         | Markdown |
| Codex       | `.codex/skills/my-command/SKILL.md`             | Skill    |
| Kilo        | `.kilocode/workflows/my-command.md`             | Workflow |
| Kiro        | `.kiro/skills/my-command/SKILL.md`              | Skill    |
| Gemini CLI  | `.gemini/commands/memerig/my-command.toml`      | TOML     |
| Antigravity | `.agent/workflows/my-command.md`                | Workflow |
| Qoder       | `.qoder/skills/my-command/SKILL.md`             | Skill    |
| CodeBuddy   | `.codebuddy/commands/memerig/my-command.md`     | Markdown |

---

## Step 3: Document in memerig-local

Update `.claude/skills/memerig-local/SKILL.md`:

```markdown
## Commands

### Added Commands

#### /memerig:my-command

- **File**: `.claude/commands/memerig/my-command.md`
- **Platform**: [ALL]
- **Purpose**: What it does
- **Added**: 2026-01-31
- **Reason**: Why it was added
```

---

## Examples

### Simple Command

```markdown
---
name: check-types
description: Run TypeScript type checking
---

# Check Types

Run `pnpm typecheck` and report results.

## Usage

Run this command after making code changes to verify type safety.
```

### Command with Parameters

Commands can reference user input or context:

```markdown
---
name: review-file
description: Review a specific file for code quality
---

# Review File

## Input

User should specify which file to review.

## Workflow

1. Read the specified file
2. Check against relevant specs
3. Report issues found
```

---

## Testing

1. Run the command: `/memerig:my-command`
2. Verify behavior matches description
3. Test edge cases

---

## Checklist

- [ ] Command file created with proper frontmatter
- [ ] Mirrored to Cursor (if needed)
- [ ] Documented in memerig-local
- [ ] Tested the command
