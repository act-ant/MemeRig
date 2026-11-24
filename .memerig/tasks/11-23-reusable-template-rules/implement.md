# Content-first rule declarations: implementation plan

Status: implemented and behaviorally verified. Sibling Rules / Spec directories and reviewed manual adoption are delivered; no independent Rules engine or installation UI.

## 1. Confirm integration points before edits

- Read the CLI backend/template guidance and the task research. Refresh the stale GitNexus index before analyzing affected symbols; resolve unavailable graph queries rather than interpreting empty results as safe impact.
- Trace the existing managed instruction entry and shared workflow/spec loading paths for main sessions and implement/check agents. Report the affected platforms and impact before changing any functions; use LSP references for exported symbol changes.
- Prefer canonical `packages/templates/assets/` sources. Do not hand-edit installed platform copies or change blank-init spec generation. Reuse existing loading mechanisms; inspect and adapt path/discovery checks if the proposed sibling Rules directory requires it.

## 2. Default baseline

- Author the baseline once in `packages/templates/assets/memerig/rules/core.md` with a default `index.md` referencing core only, and deliver these to `.memerig/rules/` through the established template pipeline.
- Route managed main-session entry instructions to the Rules index; include applicable rule bodies through the existing sub-agent context mechanism. Do not rely on transitive Markdown-link loading or duplicate baseline text across platforms.
- Preserve workflow markers, platform-neutral syntax, project-specific contracts, and update ownership. Confirm fresh init and update both deliver the default Rules files without populating project Specs or overwriting local index additions.

## 3. Optional declarations and adoption

- Add a human-readable catalog under `marketplace/rules/`. This is a content directory only: no new registry type, install command, configuration state, or loader.
- Supply independent Markdown declarations for clean cutover, production compatibility, dependency governance, and architecture research. Each states applicability, constraints, and observable compliance criteria. None grants destructive-operation authorization or overrides existing project contracts.
- Document manual adoption into `.memerig/rules/<id>.md` and a relative entry in `.memerig/rules/index.md`; keep concrete project specifications under `.memerig/spec/`.
- Demonstrate main-session index routing and delegated implement/check context inclusion with actual output. Verify existing `task.py add-context` and injection validation accept the sibling directory; minimally adapt shared checks if required, without adding another loader.
- Explain removal as a document/index/manifest edit and updates as reviewed diffs from a recorded source revision. A content reference is not an automatic update subscription. Keep template-composed and init-time selection as explicitly unselected adoption alternatives unless the user changes scope.
- Add English and Chinese adoption guidance and a catalog link from the existing Marketplace overview. Keep canonical agent-facing rule text in English. Explain that TDD remains the existing workflow option.

## 4. Verification after implementation

- Run the narrow existing CLI suites covering actual changes, once after the edit batch. Expected core command from `packages/cli`: `pnpm exec vitest run test/commands/init.integration.test.ts test/commands/update.integration.test.ts`. Include `test/configurators/platforms.test.ts` only if platform template emission is affected.
- Run a temporary end-to-end fixture through the built CLI: blank init creates only the existing Spec README and the approved default Rules files; baseline instructions are reachable; optional content is absent until adopted; one adopted declaration is reachable from the Rules index and present in both relevant task contexts.
- Exercise update with user-authored content and confirm the existing preservation/conflict behavior. Do not turn this into a new update mechanism.
- Inspect actual generated instruction/context output, not only template source text. Check source/catalog links and attribution. Add permanent tests only for uncovered consumer-visible loading/preservation risks, not exact prose or wiring echoes.
- Remove temporary fixtures/scripts. Record commands, results, and any platform proof limits.

## 5. Delivery

- Update existing user-facing documentation and applicable spec contracts only when the implemented behavior warrants it.
- Run graph change analysis before a selective commit. Keep unrelated user changes untouched.
- Complete the task only after implementation approval, behavioral verification, and the normal delivery gates.

## Rollback

Revert source changes through ordinary review. Installed rule documents and user-edited indexes must not be removed merely because an upstream catalog entry disappears. New files must use the established managed-template ownership and conflict behavior; no separate runtime state or migration engine is introduced.

## Verification evidence

- CLI build/type-check and scoped ESLint passed.
- Init integration: 56 passed. Update integration: 54 passed initially; its remaining historical-template case passed after replacing a current-template-derived fixture with a frozen historical block. The updater's legacy fingerprints were not changed.
- Template-hash, regression, and context-limit suites passed where runnable in the initial scoped run. Existing Python-3-only cases were skipped on this Windows host; the new real-hook regression uses the existing platform-aware Python convention and passed.
- Real built CLI `init --yes --no-monorepo --claude --codex --user rules-smoke` produced only `core.md` / `index.md` under Rules and only the existing README under Spec. Generated AGENTS, Codex pull-agent definitions, and channel agent definitions route to the Rules index and bodies.
- Real `task.py create`, six `add-context` calls, and `validate` accepted index/core/adopted-body entries for implement and check. Both installed Claude hooks emitted complete core and adopted production-compatibility bodies, excluded an unselected sentinel, and produced nonempty prompts (8733 / 8671 characters).
- Real Claude and Codex SessionStart hooks emitted Rules routing. This verifies emitted context, not that every external AI host follows its instructions. Other platform templates were covered by existing template regressions, not live host sessions.
- Relative links in all six catalog documents resolve. Temporary runtime fixtures were removed.
- Initial smoke caught a missing Rules-directory creation before atomic writes; fixed with `ensureDir`, then exercised successfully through the real CLI. The directory precondition is recorded in the project-setup Spec.
- Explicit `--template blank` attempted remote template resolution and failed in the existing CLI path; the successful blank-init smoke used the default without `--template`. That separate preset-selection behavior was not changed.
- GitNexus `detect-changes --scope all --repo . --limit 1000` reported 11 symbols / 16 flows and CRITICAL aggregate risk around shared initialization. Exact template Python/JS coverage remains incomplete (UNKNOWN targets and unavailable FTS); source-confirmed entry points and runtime checks supplement the graph, not an all-clear assertion. Unrelated worktree changes remain outside the selective commit.
- The first commit hook ran the full suites: core 407 passed / 2 skipped; CLI 1809 passed / 148 skipped with one native-workflow mirror failure. Synchronized the Marketplace native workflow with its bundled canonical source; retained the existing distribution-parity test.
