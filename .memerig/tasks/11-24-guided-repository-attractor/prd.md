# Guided repository attractor construction

## Goal

Provide optional guidance for constructing a repository's desired long-term design attractor, recorded as a special Spec. The default guidance template adopts this approach; other templates may organize their work without the attractor concept.

## Requirements

### Confirmed user intent

1. Treat a repository's intended long-term design direction as an **attractor**, represented by a special kind of Spec.
2. Support the applicable dimensions of framework/architecture, code design, and UI/interaction design. An attractor can describe a family of coherent future designs rather than a frozen implementation.
3. "Maintain" primarily means **guide the user in constructing the attractor**, beginning during MemeRig initialization and continuing during normal collaboration.
4. Help users express initially incomplete intentions through questions, examples, and concrete design tradeoffs. Do not assume that they arrive with an already-written attractor.
5. The default setup must include basic guidance for constructing the attractor. The user suggested presenting this as the default template, clarified that templates have different workflow and README requirements, and questioned whether some templates need the attractor concept at all.

### Proposed behavior for review

Construction and special-Spec loading below apply when the current template/project explicitly adopts this capability or the user requests it. Content preservation also applies when the capability is not adopted.

6. The default setup must expose an actionable route into guided construction; first-use collaboration must carry that adopted route forward, including projects without an automatically created onboarding task. Other templates retain their own setup objectives.
7. Existing repositories contribute evidence and candidate interpretations. Existing implementation alone must not be treated as proof of the user's desired future direction. Empty repositories must also be supported.
8. Ongoing collaboration should revisit the attractor when a material design choice, explicit user preference, recurring preference, or product-direction change provides useful context. Avoid unrelated recurring questionnaires.
9. Clearly distinguish user-established direction, AI-proposed interpretations, and unresolved questions. Promote inferred preferences only after the user endorses their repository-wide meaning.
10. Support incremental construction and deliberate deferral. An absent or incomplete attractor must not prevent ordinary work, fabricate a project vision, or silently authorize creating a task.
11. Make adopted direction available to relevant planning, implementation, and review contexts while retaining current code contracts and approved task scope. A filename alone does not authorize context injection or adoption; direction alone must not trigger unrelated rewrites.
12. Preserve user-authored attractor content across initialization, reinitialization, template installation, and update. Package/template authors must not supply a project's supposed vision by default.
13. Keep adopted construction guidance usable across supported platform entry paths, including the platform-neutral open-protocol path. This does not require every shipped workflow or Spec preset to adopt it.
14. Templates may adopt the default method, provide a custom method, or omit the capability entirely. Templates own their documents, method, and timing. Default guidance may be available as an installed resource without being active.
15. No adoption declaration means no implicit attractor workflow. Do not turn non-adoption into deferred construction, a missing-Spec warning, an interview, or a completion gate. A later explicit user request can invoke the capability without silently changing permanent project policy.

## Acceptance Criteria

Construction scenarios apply to the default template and other explicit adopters; the non-adoption and preservation scenarios cover templates without this concept.

- [x] Fresh default (blank/from-scratch) initialization installs usable basic construction guidance at a documented location, including with no platform, no developer identity, and no onboarding task; terminal output alone is insufficient.
- [x] Opt-in bootstrap onboarding guides both current-convention discovery and desired-direction construction without conflating the two.
- [x] A greenfield repository can form an initial attractor from user intent without inventing code evidence.
- [x] An existing repository can use code, references, and past decisions as discussion material while asking which properties the user wants to preserve or change.
- [x] A user can defer or leave questions unresolved and continue ordinary work without fake confirmed direction or an automatically created task.
- [x] A later relevant design conversation can resume construction and propose a focused amendment with its rationale.
- [x] A one-off implementation exception is not automatically generalized into repository-wide direction.
- [x] Framework/code/UI guidance is supported where applicable; irrelevant dimensions are not filled with generic boilerplate.
- [x] Relevant main-session and delegated contexts can access the actual attractor content; an index link alone is not counted as loaded content.
- [x] Current executable contracts and desired future properties remain distinguishable, including when they conflict.
- [x] Existing user content survives normal init/re-init/update/template flows; in adopting projects, joiners understand current direction before proposing changes.
- [x] Selecting a bundled or remote Spec preset retains its README, conventions, and adoption choice. Native workflow routing does not impose the default Spec template's choice on a silent or non-adopting preset.
- [x] An adopting workflow or Spec template can explicitly reuse, extend, or replace the default construction method. The selected method runs without a second default interview; its workflow and README are not patched to impose default policy.
- [x] A template explicitly adopting the default method can use the standalone guide without a platform skill. Competing explicit adoption/method declarations are resolved openly; a missing custom guide does not silently select the default.
- [x] A template with no attractor declaration, or one explicitly not adopting it, can complete init/onboarding/start/check/finish without attractor questions, mandatory files, missing-direction warnings, or automatic attractor-context injection.
- [x] Switching away from attractor adoption preserves existing user-authored documents; their continued presence does not reactivate the capability. Non-adoption is not tracked as deferred or incomplete work.
- [x] Ordinary task goals, acceptance criteria, and other template concepts are not automatically relabeled as attractors.
- [x] File collisions use the existing preservation/review behavior. Conflicts between a preset recommendation and project direction are surfaced as design choices, not decided by installation order or assumed directory precedence.
- [x] Behavioral verification covers fresh setup, continued construction, deferral, existing content, and representative hook-backed/manual-start consumers.

## Constraints

- Use the existing Spec, workflow, task-context, and template distribution mechanisms where sufficient.
- Preserve the existing task-creation consent and planning-review gates.
- Initial guidance may produce a small, useful document; completeness is not measured by filling every possible section.
- Recommendations above are a reviewable proposal, not evidence that the user has approved implementation.

## Out of Scope

- A mathematical convergence proof, numerical attractor score, or autonomous goal-execution engine.
- Automatically deciding a repository's values or replacing user intent with code-derived preferences.
- Implementing the target repositories' desired architecture or UI as part of installing this capability.
- Publishing a release or changing unrelated concurrent work.
- Requiring every template to adopt this concept, or adding a general capability registry/inheritance engine to express optionality.

## Planning Status

- The user confirmed the meaning of guided construction during initialization and runtime.
- The user clarified that the default setup itself must provide basic guidance, with explicit storage and template-composition boundaries, and proposed framing it as the default template.
- The user explicitly authorized creating this task and entering planning on 2026-11-24.
- The user approved implementation of the optional-adoption boundary on 2026-11-24: the default template adopts attractor guidance, while other templates may omit the concept entirely. The existing task is now in progress.

## Research References

- [Current surfaces](research/current-surfaces.md) records inspected entry points, existing contracts, integration choices, and verification limits.
- [Technical design](design.md) owns technical decisions; [execution plan](implement.md) owns ordered execution and validation.

## Verification scope

Consumer tests and real built-CLI/hook scenarios exercise installation, updates,
ownership, manual startup, SessionStart, and curated context loading. Ten recorded
model simulations cover conversational decisions; they run without tools and do
not claim saved files or autonomous multi-turn execution. See
`research/conversation-results.json` and the implementation evidence in
`research/current-surfaces.md` for results and limits.
