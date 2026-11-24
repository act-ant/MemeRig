<!-- MEMERIG:START -->
# MemeRig Instructions

These instructions are for AI assistants working in this project.

This project is managed by MemeRig. The working knowledge you need lives under `.memerig/`:

- `.memerig/workflow.md` — development phases, when to create tasks, skill routing
- `.memerig/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.memerig/rules/` — adopted behavioral rules; read `rules/index.md`, then every applicable body (`core.md` always applies)
- `.memerig/workspace/` — per-developer journals and session traces
- `.memerig/tasks/` — active and archived tasks (PRDs, research, jsonl context)

Before changing code or specs, read the applicable Rules alongside the project Specs. Include their actual files in implement/check task manifests; links are not loaded content. Do not load unadopted catalog rules.

If a MemeRig command is available on your platform (e.g. `/memerig:finish-work`, `/memerig:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable MemeRig skills
- `.codex/agents/` — optional custom subagents

Managed by MemeRig. Edits outside this block are preserved; edits inside may be overwritten by a future `memerig update`.

<!-- MEMERIG:END -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MemeRig** (14336 symbols, 20870 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/MemeRig/context` | Codebase overview, check index freshness |
| `gitnexus://repo/MemeRig/clusters` | All functional areas |
| `gitnexus://repo/MemeRig/processes` | All execution flows |
| `gitnexus://repo/MemeRig/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
