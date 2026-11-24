# Attractor construction: current surfaces and decisions

## User intent and authorization

The user wants a repository attractor to express its intended long-term design direction across applicable framework, code, and UI concerns. They clarified that maintenance means guiding users to **construct** that attractor during initialization and continuing use. They authorized planning, then approved implementation of the optional-adoption boundary on 2026-11-24. The following research sections preserve planning evidence; implementation results follow below.

## Observed repository behavior

| Surface | Evidence | Consequence for this feature |
| --- | --- | --- |
| Blank initialization | `.memerig/spec/cli/backend/project-setup.md`, contracts; `packages/templates/assets/markdown/spec/README.md.txt` | Default setup does not invent project conventions. Keep this property for project direction as well. |
| Optional onboarding | `packages/cli/src/commands/init.ts`, `InitOptions.withOnboarding`, the dispatch near the end of `init`; `project-setup.md` | Do not make attractor guidance depend exclusively on an automatically created task. |
| Creator conversation | `packages/cli/src/commands/init.ts`, `getBootstrapChecklistItems` and `getBootstrapPrdContent` | There is already a conversational first-use path that can guide construction. |
| Current bootstrap semantics | `getBootstrapPrdContent`, lines 467-474; `packages/templates/assets/common/bundled-skills/spec-bootstrap/SKILL.md`, done criteria | Both explicitly favor documenting current reality. Desired direction needs a named special-Spec contract rather than an unqualified reversal of this rule. |
| Joiner onboarding | `getJoinerPrdContent`, current-convention section; platform integration spec, Bootstrap & Joiner Task Auto-Generation | Orient a joiner to existing direction first. Both main initialization and the re-init fast path matter. |
| Manual session start | `packages/templates/assets/common/commands/start.md` | Existing discovery/routing should follow adopted project context; do not read an attractor merely because its filename exists. |
| Implementation and checking | `packages/templates/assets/common/skills/before-dev.md` and `check.md` | Adopting projects need special-Spec interpretation; non-adopters need no attractor-specific check or injection. |
| Spec evolution | `packages/templates/assets/common/skills/update-spec.md` | Current routing focuses on executable contracts. Add a distinct branch for explicit long-term intent or proposals needing user calibration. |
| Per-turn workflow | `.memerig/workflow.md`; `.memerig/spec/cli/backend/workflow-state-contract.md` | Workflow text owns behavior. Hook scripts parse it; a new attractor-specific parser or task state is unnecessary. Required routing must survive compact phase context. |
| Bundled skills | `packages/cli/src/templates/common/index.ts`, `listBundledSkillFiles` and `getBundledSkillTemplates`; `configurator-shared.md` | Existing directory discovery and shared template maps support a bundled skill with references. Do not add a second installer. |
| Canonical assets | `packages/templates/assets/common/`, `packages/templates/assets/memerig/`, `packages/templates/assets/markdown/` | Current template sources are in the templates package. Some older skills/spec examples still name `packages/cli/src/templates/**` as the content location. |
| Updates | `.memerig/spec/cli/backend/commands-update.md`, collection and whole-file workflow sections | Managed guidance follows existing conflict handling. The project attractor is user-owned content. Custom workflows must not be silently replaced. |
| Existing tests | `packages/cli/test/commands/{init,init-joiner,update}.integration.test.ts`, `test/configurators/platforms.test.ts` | Existing suites cover blank setup, opt-in onboarding, bundled skill delivery, platform parity, and preservation of edited specs. Extend consumer scenarios only where needed. |

## Important compatibility details

- The native workflow has a Marketplace mirror at `marketplace/workflows/native/workflow.md`. TDD and channel-driven workflows are separate shipped variants.
- A platform-neutral installation can have no platform skill root. The default adopter needs a standalone usable guide. Its availability does not enable construction for a template that omits or declines the capability.
- The shared template resolver uses platform-neutral placeholder rendering for `.agents/skills/`. Bundled skills own their frontmatter.
- When adopted project guidance or explicit task references make it applicable, both context manifests need the actual special-Spec file. A link is not loaded content, and file existence alone is not adoption.
- `memerig update` uses whole-file, hash-gated workflow updates. Older local customization notes describing block-only replacement are not authoritative for current behavior.
- The old Bootstrap & Joiner section describes automatic dispatch without emphasizing the newer `--with-onboarding` opt-in. Current source and `project-setup.md` establish the opt-in boundary.
- Keep user-authored direction out of bundled default content and managed template ownership. Explicit user imports remain subject to existing conflict review.

## Default guidance template clarification

The user required basic guidance in the default setup and suggested making this the default template. They subsequently clarified that different templates also have different workflow and README requirements. The existing from-scratch experience retains its `blank` selection semantics, but default guidance must be replaceable in behavior, not just isolated from file collisions.

Additional source evidence:

- `packages/cli/src/commands/init.ts`, `buildSpecTemplateChoices` lines 1173-1175: the current default picker entry is `from scratch (default)`, using `BLANK_SPEC_VALUE`.
- `packages/cli/src/configurators/workflow.ts`, `createWorkflowStructure` lines 117-121 and 162-168: workflow installation is independent of the `skipSpecTemplates` branch; a Spec preset skips the default Spec README entirely.
- `createSpecTemplates` lines 178-181: default Spec seeding writes only `README.md`.
- `packages/cli/src/commands/init.ts`, `installBuiltinSpec` lines 2162-2178: preset files are copied if absent; eligible conflicts can produce `.new` review copies instead of replacing existing content.
- `.memerig/spec/cli/backend/commands-workflow.md`, ownership and runtime parser contracts: non-native workflows are user-managed; runtime consumers read the current workflow and must not duplicate variant-specific behavior in hooks/skills. Do not add a persistent `workflow.variant` field.
- `packages/cli/src/utils/workflow-resolver.ts`, `resolveWorkflowTemplate` lines 225-257: a workflow entry resolves to one complete Markdown document. `marketplace/index.json` registers Spec and workflow entries separately.
- `marketplace/specs/learn-harness/{README,index}.md`: a preset can define a learning goal/evidence/handoff process, not merely a technology stack. Its questions and priorities cannot be assumed to match a generic software interview.
- `packages/cli/src/templates/memerig/index.ts` lines 73-77: standalone managed Markdown assets already use template exports. A default guide can follow existing asset delivery without adding a template-composition engine.

Current proposal after the user's optionality question: attractor construction is an optional Spec practice. The default Spec template explicitly adopts the standalone guide; other templates may adopt a custom method or omit the concept. Shared/native routes follow the selected template's instructions without importing default adoption. No declaration means no implicit activation, warning, reminder, or completion gate. Preserve old attractors without using their existence as automatic adoption. This supersedes both the mandatory common workflow procedure and the later "no designated method means default" fallback.

Non-adoption is distinct from deferring construction within an adopted process. Ordinary task goals and acceptance criteria need not be renamed or converted into attractors. This is a proposed product boundary from the ongoing discussion, not a new runtime feature flag or capability registry. Use existing Markdown routing and context mechanisms; the preservation contract applies regardless of adoption.

## Options considered

| Option | Benefit | Cost / limitation | Decision |
| --- | --- | --- | --- |
| Fixed terminal questionnaire inside `init` | Immediate interaction during setup | Poor fit for examples, evolving tradeoffs, and subsequent revisions; would duplicate runtime guidance | Do not use as the primary construction mechanism |
| Conversational construction, routed from init and workflow | Reuses the existing AI collaboration surface, handles partial intent, and continues during real work | Prompt behavior needs scenario evaluation as well as packaging checks | Recommended |
| Infer an attractor automatically from current code | Low initial interaction | Conflates historical implementation with desired future direction | Use code only as evidence for candidate questions, never as authority |

## Conceptual references

- Milnor, [Attractor](http://www.scholarpedia.org/article/Attractor): attractors describe asymptotic behavior under dynamics; definitions vary and need not describe a fixed endpoint.
- [Basin of attraction](http://www.scholarpedia.org/article/Basin_of_attraction): convergence depends on initial conditions and the system's dynamics.
- Thoughtworks, [Architectural fitness function](https://www.thoughtworks.com/en-us/radar/techniques/architectural-fitness-function): preserving architectural characteristics through continual assessment is a related practice, not a complete substitute for user-defined direction.

Using attractor language for repository evolution is an engineering analogy. This feature does not claim a measured state space, numeric convergence score, or mathematical proof. The document records a **desired** attractor; the workflow helps users form and apply that direction.

## Verification limits during planning

- A literal search for `attractor|吸引子` in `packages`, `marketplace`, `.memerig/spec`, and the local workflow returned no matches.
- No language servers are configured for this project in the current tool session.
- The GitNexus MCP resource was unavailable. `node .gitnexus/run.cjs --help` timed out after 60 seconds. Graph freshness, callers, processes, and edit risk have not been verified.
- Repository/source inspection supports this plan, but does not substitute for the mandatory pre-edit graph impact gate during implementation.
- No product behavior was changed or tested during planning. Planning validation concerns the task artifacts and context manifests only.

## Observed planning validation

`python ./.memerig/scripts/task.py validate .memerig/tasks/11-24-guided-repository-attractor` passed: 13 entries in each of `implement.jsonl` and `check.jsonl`.

The validator warned that four original spec bodies exceed the 32,768-byte per-file injection limit: `configurator-shared.md` (40,181 bytes), `commands-update.md` (35,222), `quality-guidelines.md` (45,262), and `platform-integration.md` (192,720). Their entries intentionally retain the authoritative files. Before editing, the implementer must explicitly read applicable sections that were truncated or delivered only as paths; a successful manifest validation is not proof of complete context delivery. Do not raise project-wide injection limits for this task.

Following the template-policy correction, both manifests include `commands-workflow.md`. The same validation command passed with 14 entries each and the same four truncation warnings. This verifies the revised planning context, not implementation or conversational behavior.

## Implementation results — 2026-11-24

### Delivered behavior

- The default Spec README explicitly adopts the standalone
  `.memerig/attractor-guide.md` method. No platform skill, developer identity, or
  onboarding task is required. Installation creates no project attractor.
- Meaningful direction belongs to user-owned `.memerig/spec/attractor.md`.
  Confirmed intent, proposals, and open questions remain distinct. The guide and
  optional bundled skill cover partial construction, deferral, relevant later
  amendments, and architecture/code/UI tradeoffs without mandatory boilerplate.
- Common/native routes and Copilot prompts load selected Spec entries and actual
  relevant adopted bodies. A custom method remains in control; silent templates,
  installed resources, and leftover direction files do not activate an interview.
- Init presents the default guidance option and routes successful setup to the
  selected workflow/Spec. Creator and joiner onboarding retain their opt-in gate.
- Managed write receipts protect skipped custom guide/workflow content. Remote
  append records only newly installed Spec paths; existing direction stays
  user-owned. Explicit whole-directory remote overwrite keeps its existing
  destructive semantics; ordinary preservation paths do not use it.
- English/Chinese READMEs and project setup, update, workflow, and compact-context
  contracts document the behavior. No release was published or version bumped.

### Consumer verification

1. The focused eight-file Vitest run covered init, joiner onboarding, init
   internals, update, workflow selection, platform parity, template hashes, and
   workflow resolution. It reported 287 passing tests and one outdated hash
   assertion. The test still expected a skipped file to become owned; it was
   updated to assert the write-receipt contract. The entire hash suite then passed
   44/44 tests.
2. Default initialization with no template and explicit `--template blank` both
   passed the isolated open-protocol integration test: 2/2, network disabled.
3. CLI build passed after the final runtime-route correction. CLI `eslint src/
   test/` and `tsc --noEmit` passed. Packaging inspection with `npm pack --dry-run
   --json --ignore-scripts` found the standalone guide, bundled skill, and example
   reference in `dist/templates/`.
4. The built CLI ran in throwaway repositories. A default install without a
   platform, identity, or onboarding produced reachable guidance and no fabricated
   direction/task. Immediate `update --dry-run` printed `Already up to date!`.
5. A fixture with Claude and Codex installed rendered both skill paths correctly,
   including frontmatter and resolved placeholders. Its bootstrap entry, actual
   `get_context.py --mode phase`, and real SessionStart hook reached the selected
   root Spec entry.
6. Real implement/check hooks loaded a curated direction sentinel from the actual
   file. A manifest containing only the index did not auto-load the leftover
   direction. This verifies the existing explicit context-loading boundary.
7. Preset installation and re-init preserved the selected README, custom workflow,
   and previously authored direction byte-for-byte; the direction remained
   outside template ownership. Existing integration coverage exercised remote
   append, update conflicts, and `.new` review copies.
8. The temporary smoke harness and fixture directories were removed after the
   successful run.

### Conversational verification and limits

`conversation-results.json` records ten stateless model simulations using the
delivered guide/router and each scenario's Spec/workflow context: greenfield,
explicit UI direction, existing repository, deferral, local exception, later
amendment, silent template, custom method, missing custom guide, and conflicting
adoption declarations. The observed responses honored the expected distinctions.

These models had no tools. Their intended document changes are not claims of
saved files or autonomous multi-turn work. Unsupported structured-output responses
were retried as natural-language evaluations; the failed attempts were recorded
separately in session scratch storage. Real file/hook behavior is covered by the
consumer checks above.

### Root causes captured in contracts

- **Ownership:** scanning every managed or Spec path after skip-existing/append
  initialization falsely claims customized files as pristine upstream content.
  Actual write receipts and newly added Spec paths preserve the update boundary.
- **Default selector:** explicit `blank` previously reached the remote-template
  lookup. It now takes the same offline default path as an omitted template.
- **Compact context:** workflow-state blocks are removed by `get_phase_index()`.
  A root Spec route only inside those blocks disappears from manual startup and
  SessionStart. Both native copies now include the generic route in the ordinary
  Phase Index body; the real consumers passed after rebuilding.

### Tooling and graph analysis

The installed GitNexus 1.6.12 runner restored graph access. Pre-edit upstream
impact outputs were retained for `init`, `handleReinit`,
`buildSpecTemplateChoices`, `createWorkflowStructure`,
`getBootstrapChecklistItems`, `getBootstrapPrdContent`, `getJoinerPrdContent`,
`collectTemplateFiles`, and `initializeHashes`. UNKNOWN results were not treated
as unused symbols. LSP remained unavailable because no server was configured.

Pre-commit `detect_changes` used `scope: all`, `limit: 1000`. Its structured result
reported 145 changed symbols and 15 affected processes, with HIGH risk across the
current worktree, including unrelated dirty content. The affected execution flows
run through workflow creation and update template collection. The full structured
arrays were retained in session scratch storage; the CLI summary alone truncates
its display. FTS remained unavailable, but dependency graph operations completed.
The integration and real CLI/hook scenarios above exercise the changed delivery,
preservation, and loading boundaries.

### Additional commit-gate regression

The mandatory pre-commit hook ran the full core/CLI suites. Core passed 407 tests
with 2 skipped; CLI passed 1,826 with 148 skipped and failed one existing queued
turn-order test. The observed order was `done`, next `turn_started`, then prior
`turn_finished`.

`applyParseResult` cleared `TurnTracker` before awaiting the durable completion
append, allowing the inbox watcher to dispatch early. It now retains the active
turn until persistence finishes and checks object identity before releasing it,
so an interrupt cannot cause that release to pop a replacement turn. Pre-edit
impact for this function was LOW with the stdout pump as its direct production
caller. Existing queue, interrupt, and idle coverage passed after the fix: 30/30
tests across the two channel files, followed by typecheck and scoped ESLint.

The final structured graph analysis includes this correction: 150 symbols and
21 processes across the full dirty worktree, risk CRITICAL, with complete arrays
and no partial/truncation flag. The mandatory commit hook supplies the final
full-suite gate. This small supervisor correction was necessary to clear that
gate; unrelated worktree changes remain outside the selective commit.

The normal commit retry passed all mandatory hooks and produced implementation
commit `4f4912e283`. No hooks were skipped. The completion record and session
journal are maintained separately from that implementation commit.

