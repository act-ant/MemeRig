# Implementation plan

1. Add user-rule discovery/parsing helpers to the canonical script source `packages/templates/assets/memerig/scripts/common/session_context.py`; mirror the identical change into the dogfood copy `.memerig/scripts/common/session_context.py`.
2. Wire the helpers into `get_context_text` and `get_context_json`; keep the section absent when no rules exist.
3. Update routing text:
   - `packages/templates/assets/markdown/agents.md` (managed block)
   - `packages/templates/assets/memerig/workflow.md` (Rules System)
   - `packages/cli/src/configurators/shared.ts` (pull-based prelude)
   - `packages/templates/assets/common/skills/before-dev.md`
   - `packages/templates/assets/common/skills/check.md`
   - `packages/templates/assets/common/commands/start.md`
4. Mirror the managed routing into the dogfood root `AGENTS.md` / `CLAUDE.md` and `.memerig/workflow.md` where the corresponding block exists.
5. Add `packages/cli/test/scripts/user-rules-context.integration.test.ts` using a temporary HOME and the real `session_context` functions.
6. Update project Specs: `project-setup.md` (rules ownership/lifecycle) and `configurator-shared.md` (prelude contract). Do not add user-level spec/tasks.
7. Run the narrow test first, then the existing rules/context tests, lint, and typecheck.
8. Run GitNexus change analysis, then commit only task-owned changes.

## Verification commands

```bash
pnpm vitest run packages/cli/test/scripts/user-rules-context.integration.test.ts
pnpm vitest run packages/cli/test/scripts/rules-context.integration.test.ts
pnpm --filter memerig lint
pnpm --filter memerig typecheck
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

## Risks

- Python `Path.home()` differs on Windows; the test must set both `HOME` and `USERPROFILE` for the child process.
- Inlining `always` bodies can grow SessionStart context; documentation constrains it to short personal constraints.
- Dogfood copies and template copies must stay byte-identical for scripts; verify with `diff`.

## Verification evidence

- `pnpm vitest run test/scripts/user-rules-context.integration.test.ts` — 6 passed: text/JSON parsing, always inline, index path-only, unknown/malformed handling, non-Markdown and nested exclusion, stable order, SessionStart hook payload, hook-built sub-agent prompt.
- `pnpm vitest run test/scripts/rules-context.integration.test.ts test/configurators/shared.test.ts test/templates/memerig.test.ts` — 88 passed.
- Broader run: `test/regression.test.ts`, `test/configurators/platforms.test.ts`, `test/templates/shared-hooks.test.ts`, `test/commands/update.integration.test.ts`, `test/commands/init.integration.test.ts` — 699 passed, 13 skipped.
- `pnpm lint` and `pnpm typecheck` pass. `pnpm lint:py` reports pre-existing errors in `common/task_execution.py` (untouched by this task); the changed Python files add no diagnostics.
- `diff` confirms the dogfood `.memerig/scripts/common/session_context.py` is byte-identical to the template copy; bundled/marketplace native workflows and the two Rules index files also match their mirrors.
- GitNexus impact and detect-changes commands timed out three times (dependency resolution hang); caller analysis was completed by text search: `get_context_text` / `get_context_json` are imported by `common/git_context.py` and exercised by `regression.test.ts`; `buildPullBasedPrelude` is internal to `configurators/shared.ts` and its injection wrappers.
