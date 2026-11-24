# Guided repository attractor construction: execution plan

Status: implementation authorized on 2026-11-24. Execute the reviewed optional-adoption design and preserve non-adopting templates' existing workflows.

## 1. Preconditions

- [x] Capture confirmed user intent and separate proposed behavior in `prd.md`.
- [x] Inspect current initialization, bootstrap, joiner, shared workflow skill, and template ownership contracts.
- [x] Record source evidence and graph/LSP limitations in `research/current-surfaces.md`.
- [x] Review the proposed design with the user and incorporate corrections.
- [x] Validate both context manifests, then activate this task through the existing task command after approval. Activation succeeded in degraded mode because no shell session identity is exposed; use the explicit task path for all work.
- [x] Load relevant specs/rules before source edits, including `commands-workflow.md`. Restore a usable GitNexus entry point, check freshness, and run upstream impact for each existing function being changed (initial candidates: `init`, `handleReinit`, `buildSpecTemplateChoices`, `createWorkflowStructure`, `getBootstrapChecklistItems`, `getBootstrapPrdContent`, `getJoinerPrdContent`; locate the relevant update asset owner before editing it). Report HIGH/CRITICAL risk and investigate UNKNOWN results; absence of graph results is not safety evidence.
- [x] Recheck available language tooling before exported-symbol changes. `lsp status` reports no configured language servers; use graph analysis and explicit source inspection without claiming LSP verification.

## 2. Implement the optional construction contract

- [x] Add the standalone default guide at `packages/templates/assets/memerig/attractor-guide.md`, plus the `attractor` bundled skill as a selected-method router with optional default examples.
- [x] Specify `.memerig/spec/attractor.md` for projects adopting this capability, including confirmed direction versus open proposals and a useful partial document. Non-adopting templates require neither this file nor this concept.
- [x] Make the default Spec README explicitly adopt the default guide. Keep bootstrap guidance template-aware without making its ordinary goals implicit attractors.
- [x] Present default/blank setup as the default guidance template, preserving `blank` semantics and separate workflow/Spec selection. Native/common routing follows the selected template; it must not inherit the default Spec README's opt-in after a different preset is selected.
- [x] Deliver the standalone guide through existing managed-asset paths. Resource availability and explicit capability adoption are separate; neither guide/skill installation nor an existing attractor file activates the workflow.
- [x] Keep explicit user intent sufficient to record progress, while requiring calibration of inferred repository-wide preferences.

## 3. Connect initialization and continuing work

- [x] Route creator bootstrap and joiner onboarding through the selected template's setup objectives. Include attractor construction/orientation only for adopters, preserving `--with-onboarding` and task consent.
- [x] Add a template-neutral successful-init route and clear default-option presentation, including re-init and no-platform paths. Default entry documents expose the adopted guide; non-adopters receive no attractor-specific task or notice. Keep `--yes` noninteractive and install no fabricated attractor.
- [x] Keep common start/continue/brainstorm/before-dev/check/update-spec/finish-work routes focused on the current adopted project context. Do not add unconditional attractor triggers, missing-file checks, or automatic context injection.
- [x] Preserve the native distribution mirror and workflow-specific processes. Do not retrofit attractor steps into every shipped workflow; adoption and method/timing are separate choices.
- [x] Treat absent adoption as no attractor integration. Within explicit adoption, follow the chosen default/custom method and avoid duplicate interviews. Resolve incompatible explicit declarations openly; do not silently replace a broken custom reference.
- [x] Curate actual attractor content only when adopted guidance or explicit task references make it applicable. Reuse existing loaders without a filename-based injector. Preserve old documents when adoption stops without automatically reactivating them.
- [x] Update separately maintained Copilot prompts and meta references only where they describe the changed paths.
- [x] Distinguish non-adoption from deferred/incomplete construction. Non-adopters have no attractor reminders or completion gates; adopters can defer, and one-off choices do not silently amend project direction.

## 4. Verify after the implementation is complete

Do not run builds, lint, tests, or formatters midway through delegated implementation. After the complete change, run the narrow relevant checks once; repeat only for a new change, failure, or unresolved concern.

### Consumer scenarios

| Scenario | Observable result |
| --- | --- |
| Fresh default/blank init, no platform, developer identity, or onboarding | Standalone default guide is usable and default entry instructions identify it; no fake attractor, unsolicited task, or interactive prompt under `--yes` |
| Fresh init with supported platform(s) | Generated skill and references are usable, correctly rendered, and managed by the existing template map |
| Bundled or remote Spec preset with its own README | Preset content and adoption choice survive; native routing does not import the default Spec template's opt-in into another preset |
| Silent template or explicit non-adoption, including onboarding and an installed skill | Init/start/check/finish complete without attractor questions, tasks, missing-file checks, or automatic context injection |
| Switching to non-adoption with an existing attractor | User bytes survive; file presence does not reactivate construction or make its content mandatory |
| Custom workflow with its own method and cadence | Its content and instructions remain authoritative for that selected route; shared skills do not impose the native interview or timing |
| Explicit extension, competing declarations, or missing designated guide | Extension runs only as directed; incompatible choices are surfaced, and broken references do not silently select the default |
| Creator onboarding explicitly enabled | Follows the selected template's setup objectives; default adoption exposes both convention discovery and desired-direction construction |
| Existing checkout / new developer, default re-init path | Preserves existing direction; adopted guidance explains it, while non-adoption adds no attractor-specific orientation |
| Re-init, changing Spec/workflow templates, and ordinary update | User attractor bytes and custom workflow/README content survive normal preservation paths; locally modified default guidance follows existing conflict review |
| Greenfield conversation with vague intent | Focused questions lead to useful partial direction without invented code evidence |
| Existing repository with conflicting history | AI distinguishes current implementation from the user's desired direction |
| User defers or provides a local exception | Ordinary work continues; no manufactured agreement or global amendment |
| Later design conversation and context handoff | Relevant adopted content is available; a proposed amendment is distinguished from confirmed direction |
| Hook-backed and manual-start entry points | Both respect adoption/non-adoption; compact context retains the adopted route without imposing it on silent templates |

Exercise conversational scenarios against the delivered guidance and retain the observed results. Do not label fixture assertions or matching prose as proof of autonomous AI behavior.

### Commands and suite selection

Known repository commands:

```text
pnpm build
pnpm --filter memerig test test/commands/init.integration.test.ts test/commands/init-joiner.integration.test.ts test/commands/update.integration.test.ts test/configurators/platforms.test.ts
pnpm --filter memerig lint
pnpm --filter memerig typecheck
```

- Extend existing consumer tests only where their coverage does not exercise the new delivery or preservation edge. Do not add tests that merely pin prompt wording or reassert trivial wiring.
- Run affected existing workflow/context/regression cases by focused test selection, particularly the native workflow mirror and generated session/context routes. Choose their exact filters after reading the test declarations during implementation.
- Inspect `npm pack --dry-run --json` from `packages/cli` after the build and verify the standalone guide and new skill/reference assets are in the package file list. This is a packaging inspection, not publication.
- Launch the built CLI in temporary repositories through `packages/cli/bin/memerig.js` with the required absolute path and options for each scenario. Observe the printed guidance and generated files. Never run setup smoke cases against this working checkout.
- Run built `update --dry-run` in a clean generated fixture to check the newly delivered files do not produce immediate update churn.
- Run the relevant real hook/context commands in an isolated fixture for the context-loading scenario. Respect existing environment isolation and platform-specific Python rendering.
- Remove throwaway fixtures/scripts after recording evidence. No full repository suite is planned unless a new failure establishes a broader dependency.

## 5. Documentation, review, and completion

- [x] Update the narrow project contracts affected by the new special Spec and the English/Chinese README entry points. Record the behavior in the repository's existing release-note mechanism when appropriate; do not invent an unrelated documentation structure.
- [x] Review every acceptance criterion, including default no-platform setup, optional adoption, non-adopting/silent templates, ongoing construction, and preservation without automatic reactivation.
- [x] Run repository-required graph change analysis before any implementation commit. Resolve incomplete/truncated analysis rather than treating it as a clean result.
- [x] Commit only task-owned changes using the session's selective commit mechanism; preserve concurrent user work. Implementation commit: `4f4912e283`.
- [x] Complete the task and record the session through the existing finish-work process only after implementation and verification are finished. Task completed in place; session 6 recorded against `4f4912e283`.

## Rollback boundaries

The change adds managed guidance and scoped initialization messaging. If a verification gate fails, fix or revert those task-owned changes; do not delete user-authored attractors. Preserve existing task records, user preferences, custom workflows, and unrelated generated files.

## Planning validation

Before presenting this plan, run `task.py validate` for this task after curating both manifests. This checks planning context, not the product behavior above. The implementation tests and acceptance criteria remain pending until implementation is authorized and performed.

### Observed planning validation

The planning context validation passed on 2026-11-24 with 13 entries per manifest. It reported per-file truncation warnings for `configurator-shared.md`, `commands-update.md`, `quality-guidelines.md`, and `platform-integration.md`.

Before source edits, explicitly read the applicable original contracts beyond any injected cutoff: bundled skill distribution and Bootstrap & Joiner routing; template maps and platform-neutral rendering; update ownership/conflict handling; and the relevant TypeScript/testing constraints. Follow any index-only fallback paths as well. Keep the original files in the manifests, and do not treat truncated injection as completed spec loading or change the project's global injection limits.

After the template-policy correction, validation passed again with 14 entries per manifest, now including `commands-workflow.md`. The same four truncation warnings remain; the original-file reading requirement above still applies. Only planning artifacts and context manifests changed in this correction.

### Observed implementation validation

Implementation, consumer smoke proof, targeted regressions, packaging inspection,
and conversational evaluation are complete. Detailed results and limitations are
recorded in `research/current-surfaces.md`; raw model responses are in
`research/conversation-results.json`. The temporary runtime harness was removed.

