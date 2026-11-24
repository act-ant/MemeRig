# Guided repository attractor construction: design

Status: approved for implementation on 2026-11-24, including optional adoption and no implicit activation for silent templates.

## 1. Product boundary

MemeRig will offer attractor construction as an optional Spec practice. The default guidance template adopts it and supports initialization, established repositories, joiners, and subsequent design conversations. Templates may instead use their own goals, briefs, or completion criteria without introducing an attractor.

Use conversation for adopted construction. CLI and onboarding entry points route through the selected template's setup instructions instead of imposing an attractor objective on every project. The CLI does not invoke a model or infer whether arbitrary Markdown means adoption.

Keep this as one task: the shared meaning, entry routes, context handling, and preservation behavior form one end-to-end deliverable. The ordered work packages in `implement.md` are implementation boundaries, not separately complete features.

### Framework contract, default guidance, and template policy

Present the current `from scratch (default)` experience as the **default guidance template**. Its Spec README explicitly adopts and links the default construction method. The native workflow follows the selected Spec/project instructions; selecting a different preset must not silently inherit the default Spec README's adoption. Other templates may adopt, customize, or omit this capability. Reuse `blank` semantics and separate Spec/workflow choices without adding a template type, feature registry, CLI flag, or installer.

| Responsibility | Proposed location | Ownership and composition |
| --- | --- | --- |
| Default construction method | `.memerig/attractor-guide.md` | Standalone managed resource for explicit adopters; being installed does not activate it |
| Adoption, scheduling, and entry instructions | Current template/project workflow and Spec entry documents | The default Spec template opts in. Other templates need no attractor declaration at all; shared routes must not supply an implicit opt-in |
| Template-specific construction method and domain guidance | The adopting template's own documents or inline instructions | May explicitly reuse, extend, or replace the default method; non-adopting templates retain their own concepts |
| The project's actual desired direction | `.memerig/spec/attractor.md`, when adopted and usefully authored | User-owned output, never mandatory for a non-adopting project or generic default-template content |
| Optional skill entry and deeper default examples | The installed platform's `attractor` skill and its references | Use only for adopted construction or an explicit user request; skill installation does not enable the capability |

For adopters, the default guide explains what an attractor represents, where the resulting document belongs, how to begin with a focused intent question, how to distinguish established direction from proposals, and how to continue construction. A link or terminal notice alone is insufficient. The special-Spec contract is shared by users of this capability, not a prerequisite for every MemeRig template.

Current Spec presets skip the default Spec README, and workflow templates supply a complete workflow document. Neither is a stable container for mandatory shared prose. Install the default guide independently using existing managed-asset delivery. Default documents link to it; selected templates keep their own documents and choose their own construction route. Do not add managed-block merging or silently insert default instructions into arbitrary templates.

Spec selection and workflow selection remain separate choices. A template's silence does not request adoption or mean deferred construction. Default adoption belongs to the default Spec template's own instructions, not a global native-workflow or shared-skill fallback. A selected workflow may supply its own explicit adoption or decline it; incompatible active instructions need a scoped decision. Do not force attractor steps into every shipped or third-party workflow.

### Adoption precedes method selection

1. Follow the current template/project instructions and explicit user request. If neither adopts or invokes attractor construction, keep the existing workflow without attractor-specific questions, requirements, or context injection. Templates do not need an opt-out declaration to remain independent of this concept.
2. The default Spec template explicitly adopts `.memerig/attractor-guide.md`. An adopting template may explicitly reuse that method, extend it, or name its own. Missing adoption is never shorthand for using the default.
3. Non-adoption creates no missing-file warning, unfinished checklist, completion gate, or reminder to revisit construction. Deferral is a separate choice made within an adopted construction process.
4. If active instructions explicitly conflict about adoption or the selected method, surface that concrete conflict rather than resolving it by installation order. A broken custom reference is not permission to substitute the default.
5. Preserve existing user-authored attractors when a project stops adopting this capability. Their presence alone does not reactivate it or make them mandatory context; explicit task references remain usable through ordinary Spec/context mechanisms.
6. Keep adoption and routing in existing Markdown instructions. Do not add a capability registry, configuration state, document parser, or auto-discovery rule based on the filename. Shared skills follow adopted project context and do not turn every goal or design brief into an attractor.
7. An explicit user request can invoke the guidance for the current work. It does not, by itself, authorize imposing a permanent attractor workflow on the project.


## 2. Special-Spec document

The proposed canonical project artifact is `.memerig/spec/attractor.md`.

- It is repository-owned content, authored from the user's intentions and explicit decisions.
- The root location makes its project-wide role distinct from package/layer code contracts. Applicable statements can name their package or domain without introducing a new hierarchy.
- No parser, frontmatter schema, task status, numerical score, configuration flag, or new registry is required.
- Installation does not create an empty or generic project attractor. Create the file when there is meaningful direction or concrete exploration the user wants to retain.
- Existing project documents can be referenced for examples and rationale. Do not duplicate their content wholesale.

Suggested content is a writing guide, not mandatory empty headings:

| Content | Meaning |
| --- | --- |
| Purpose and confirmed direction | Who the project serves, what it should become, and properties the user has established |
| Design qualities | Applicable architectural, code, and UI qualities, described through observable examples |
| Tradeoffs and boundaries | Which qualities take priority when they conflict, and which outcomes the project deliberately avoids |
| Open questions and proposals | Concrete unresolved questions and AI interpretations, explicitly labeled as unadopted |
| Evolution notes | Brief reasons for material changes to direction; link existing decisions where useful |

A meaningful first document can be short and incomplete. Omit irrelevant dimensions. If there is only exploration, explicitly state that no direction has been adopted yet rather than leaving a misleading empty confirmation section.

Current code contracts describe what implementation can rely on now. The attractor describes intended evolution. Neither file location grants automatic precedence over explicit user instructions, task scope, or existing contracts. Surface a real conflict in the relevant design decision rather than rewriting code or direction implicitly.

## 3. Default construction interaction

The following loop is the default template's method. A selected custom method may organize construction differently while preserving the special-Spec contract and existing task consent.

1. Read existing direction and the user's current request. Inspect project evidence only as needed to avoid asking answerable questions.
2. Identify the next consequential uncertainty: purpose, a desired experience, a quality to preserve, an example to emulate/avoid, or a concrete tradeoff.
3. Ask one focused question with context and a recommendation where appropriate. Do not require an exhaustive questionnaire or expertise in the word "attractor".
4. Synthesize what the answer establishes. Explicit user statements and decisions authorize recording that intent; do not repeatedly ask for the same permission.
5. If the AI infers a broader principle from an example or repeated local choice, present that interpretation for calibration before treating it as repository-wide direction.
6. Persist useful progress in the special Spec, keeping proposals visibly separate. End the interview when the current uncertainty is resolved or the user defers, and resume the user's actual work.

The guidance should include concrete examples for greenfield projects, existing codebases, and UI-heavy products. These examples illustrate elicitation, not preset values to install in a user's repository.

## 4. Initialization and first use

- Fresh default initialization installs `.memerig/attractor-guide.md` and a default Spec entry explicitly adopting it. This default route works without a platform, developer identity, or onboarding task.
- A selected Spec preset keeps its own README and adoption choice. The default README is not overlaid. Shared guide/skill assets may be present as unused resources without making the concept part of that template's workflow.
- The active workflow controls setup and cadence. Shared entry instructions follow the selected template's adopted guidance; they do not select attractor construction merely because no custom method was named.
- With `--with-onboarding`, creator bootstrap follows the selected template's setup objectives. For the default adopter this includes current-convention discovery and future-direction construction; for a non-adopter it introduces no attractor objective. Scope "document reality" to code-specs only where the adopted special Spec needs that distinction.
- Without onboarding, the default adopter offers construction at a relevant design interaction. Non-adopting templates continue their ordinary process. Preserve task consent, and distinguish explicit deferral within adoption from not adopting the capability.
- In adopting projects, joiner guidance explains existing direction before proposing changes. In non-adopting projects, preserve any old attractor document without creating an attractor-specific orientation or task.
- Apply initialization notices at the successful main path and relevant successful re-init paths. Keep cancellation, errors, and opt-in task behavior intact.
- `--yes` remains noninteractive. It can print the route but cannot stand in for the user's design preferences.

## 5. Ongoing construction and loading

These integration points apply only to adopted construction. A selected workflow may organize it differently or have no attractor integration. Shared skills load the context required by the current project/task; they do not add global attractor triggers or checks.

| Workflow point | Required behavior |
| --- | --- |
| Session start / continuation | In adopting projects, read applicable attractor content and recognize partial/deferred construction; non-adoption creates no construction reminder |
| Brainstorm / important design choice | Use known direction, identify the relevant missing intent or conflict, and ask a focused construction question when useful |
| Implementation / checking | Load actual relevant content; preserve adopted direction within the approved task; do not enforce unadopted proposals or start unrelated refactors |
| Spec update / finish | Capture explicit durable intent or offer a justified amendment; one-off implementation details and exceptions do not automatically change direction |
| No active task | Keep the existing task-consent contract; construction guidance does not grant permission to create or start tasks |

Default triggers are semantic: a material tradeoff, explicit change of purpose, or evidence of a recurring preference. Mere task completion is not a mandatory attractor revision. Respect the selected workflow's construction timing and any explicit deferral. Use existing task/session notes when a relevant deferral needs to survive a handoff, without inventing an additional preference store.

When the adopted project guidance or explicit task context makes the attractor relevant, curate its actual file into implementation/review manifests; inline flows read it directly. Reuse ordinary Spec/context loading and its limits. Do not inject it into every task based on filename or file existence. A document link alone is not loaded context.

## 6. Distribution and source ownership

Add the default guide at `packages/templates/assets/memerig/attractor-guide.md`, installed as `.memerig/attractor-guide.md` through existing managed-file delivery. It owns the complete default method so a platform skill is optional. Shared asset availability is not adoption; only the default template, another explicit adopter, or an explicit user invocation uses it.

Add a built-in `attractor` skill at the new canonical source directory `packages/templates/assets/common/bundled-skills/attractor/`:

- `SKILL.md`: require adopted construction or an explicit user invocation, then resolve and load that method. Do not auto-dispatch for ordinary goals or repeat generic interviews and variant-specific scheduling.
- `references/construction.md`: deeper examples for the default method, including partial direction and amendments; use only when the selected method calls for them.

Existing bundled-skill discovery and the single platform-template map distribute these files. No per-platform installer is planned. Frontmatter belongs to the bundled skill itself.

Expected editing surfaces after approval:

| Owner | Planned changes |
| --- | --- |
| `packages/cli/src/commands/init.ts` | Default-option presentation and template-neutral setup/onboarding routes; do not add unconditional attractor tasks or terminal notices |
| `packages/templates/assets/markdown/spec/README.md.txt` | Explicit default-template adoption, special-Spec layout, ownership, and distinction from current code contracts |
| `packages/templates/assets/common/bundled-skills/attractor/` (new) | Selected-method routing and optional deeper default examples |
| `packages/templates/assets/common/bundled-skills/spec-bootstrap/` | Follow adopted template objectives; distinguish desired-direction work from convention extraction only where applicable |
| `packages/templates/assets/common/commands/{start,continue,finish-work}.md` and `common/skills/{brainstorm,before-dev,check,update-spec}.md` | Follow adopted project context without universal attractor dispatch or checks |
| `packages/templates/assets/memerig/workflow.md` | Follow selected-template setup/context instructions; do not activate the default Spec template's attractor policy for other presets |
| `marketplace/workflows/native/workflow.md` | Preserve the native mirror contract; other workflow variants need no mandatory attractor procedure |
| `packages/templates/assets/memerig/attractor-guide.md` (new) | Complete method for the default adopter and explicit reuse; non-adopting templates need not mention it |
| `packages/cli/src/templates/memerig/index.ts`, `configurators/workflow.ts`, and `commands/update.ts` | Export and deliver the standalone managed guide using existing asset and preservation patterns |
| `packages/templates/assets/copilot/prompts/` and bundled `meta` references | Synchronize independently maintained start/update/onboarding documentation that describes these surfaces |
| `.memerig/workflow.md` and applicable `.memerig/spec/` docs | Focused dogfood contract updates; preserve unrelated local content |
| `README.md` and `README_CN.md` | Concise English/Chinese user entry and lifecycle explanation |
| Existing init/update/configurator/context test suites | Exercise changed consumer behavior; avoid prose snapshots |

Inspect concrete consumers before editing; the table is a scoped map, not permission to rewrite entire directories. Generated distribution content is produced by the existing build. Do not bulk-refresh unrelated locally modified platform files.

## 7. Compatibility and ownership

The project attractor is not a bundled template and must not be claimed in template hashes merely because it lives under Spec. Re-init, switching Spec presets, and ordinary update must preserve it. Explicit registry/template file conflicts continue through the existing preservation/review mechanisms; do not introduce silent replacement or a new overwrite policy.

The default guide lives outside selected workflow/Spec documents. Installing or updating it does not adopt the capability or select a method. Preserve template-owned documents and ordinary workflows without attractors; the default README remains the default template's own opt-in, not an overlay.

Separating file ownership prevents accidental replacement; it cannot guarantee that every template recommendation agrees with the user's direction. When such a semantic conflict matters to a task, explain the competing assumptions and resolve it through the existing design discussion. Neither the last-installed template nor the attractor's directory automatically overrides an executable contract.

Managed asset updates may make guidance available without enabling it. Existing modified/custom workflows and preset READMEs retain their ownership. Do not migrate silent templates into attractor adoption, add reminders, or automatically reactivate the capability because an old attractor file remains. Switching away preserves the file while removing no-longer-applicable automatic routing.

Rollback removes or restores only the implementation's managed guidance changes. Preserve any project attractor already authored by a user. No task schema or data migration is introduced.

## 8. Validation and implementation prerequisites

Use built-output setup smoke checks, existing platform parity tests, content-preservation scenarios, real context entry points, and conversational scenario review. Artifact delivery alone cannot establish the quality of the interview.

Planning initially could not establish graph freshness or blast radius because
MCP had no resource and the CLI helper timed out. Implementation restored a usable
GitNexus runner and performed upstream analysis before changing the affected
functions. LSP reported no configured server; no LSP verification is claimed.

The optional-adoption design was approved and implemented on 2026-11-24. Observed
consumer and conversation results, including their limits, are recorded in
`research/current-surfaces.md` and `research/conversation-results.json`.
