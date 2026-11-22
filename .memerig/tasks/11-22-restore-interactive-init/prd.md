# Restore Interactive Init Guidance (with AGENTS.md open-protocol fallback)

## Problem

`memerig init` on a fresh project is silent about the two choices that define the install:

1. **Which AI platforms to configure.** Since `a6f6104c` (self-hosted workflow refactor) platform selection is flag-only. `memerig init -u plume` configures nothing and prints no warning, producing a 37-file core-only install that looks broken (`Tracking 37 template files`).
2. **Which spec template to use.** The `Select a spec template:` picker is gated behind `useMarketplace` (upstream `init.ts:1487`), which is only true with `--registry` or a marketplace `--template`. Plain init never shows it, and `skipSpecTemplates: !useMarketplace` means `.memerig/spec/` is never created either.

Pre-refactor behaviour (Trellis) is documented in `git show a6f6104c^:packages/cli/src/commands/init.ts:1447-1460` (platform checkbox) and `:1602` (spec picker).

Additionally the owner requires that **a project with no platform configured is a first-class mode**: it must run on the AGENTS.md open protocol (any agent that reads `AGENTS.md` can drive `.memerig/scripts/` + `.memerig/workflow.md`), not degrade into an unexplained partial install.

## Requirements

- R1 — Interactive platform selection on first init: when no platform flag is given, `-y` is absent, and stdin is a TTY, show a checkbox of all registered platforms, pre-checked from `defaultChecked`. Zero selections is valid and selects the AGENTS.md open protocol.
- R2 — Interactive spec template selection on first init: when `--template`/`--registry` are absent and `-y` is absent, show a picker that always includes the bundled presets (`learn-harness`, `trellis`, `game-dev`) and `from scratch`, plus marketplace spec templates when the index is reachable. Choosing a bundled preset installs it into `.memerig/spec/`.
- R3 — AGENTS.md open-protocol mode is explicit and complete: no platform selected (interactively or non-interactively) installs the full workflow structure (spec templates, workspace, channel agent definitions, `.gitattributes`) plus `AGENTS.md`, and prints a console notice naming the protocol.
- R4 — Never crash on non-TTY: any prompt path that a non-interactive caller would have hit falls back to defaults instead of raising inquirer's `ERR_USE_AFTER_CLOSE`.
- R5 — No regression for explicit flags: `memerig init -y --claude` and `memerig init --claude --cursor --template trellis` keep their current output and file sets.

## Constraints

- Changes stay inside the CLI package (`packages/cli/src/commands/init.ts`, `packages/cli/src/utils/builtin-specs.ts`, configurator wiring if needed, tests).
- `AGENTS.md` content stays a static managed block: `memerig update` re-renders it from a single template, so no per-project conditional text.
- Prompts must be injectable so tests do not depend on a TTY.

## Acceptance Criteria

- Fresh TTY project, `memerig init -u plume`: prints a platform checkbox (defaults checked) and a spec template picker; selecting none + `from scratch` yields AGENTS.md protocol mode with a notice, no `.claude/`.
- `memerig init -y` in a fresh project: no prompts, AGENTS.md open-protocol notice, `.memerig/spec/` present, no platform directories.
- `memerig init -y --claude`: unchanged single-platform install.
- `memerig init -y --claude --cursor --template trellis`: unchanged.
- Non-TTY stdout with prompts expected: no unhandled rejection, defaults applied.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` pass; new unit tests cover tool-resolution modes and spec-choice construction.

## Out of Scope

- Workflow template (`native`/`tdd`/channel) prompting — remains flag/`memerig workflow` driven.
- Re-init fast path (`handleReinit`) menu changes.
- Marketplace changes.
