# Proposed default baseline and optional Rules

Status: approved for implementation. Rules are a declarative category like Specs; sibling directories and reviewed manual adoption are selected. No independent Rules engine or installation UI.

## Layers

1. **Default engineering baseline**: a short platform-neutral set of behavior constraints stored separately from optional content at `.memerig/rules/core.md`. Preserve blank initialization's project-Spec contract: only the existing Spec README, not populated project conventions.
2. **Optional rule declarations**: reusable Markdown constraints explicitly adopted into the project's Rules directory and index. “Rule” describes content, not an enabled/disabled runtime resource.
3. **Project specs**: concrete repository architecture, commands, dependency policy, compatibility promises, and domain constraints under `.memerig/spec/`. Keep the physical distinction clear without inventing precedence; conflicts must be reconciled explicitly.

Reuse Markdown, indexes, and task context manifests, not necessarily the same physical directory. Minimal path/discovery adaptation to existing mechanisms is in scope if required and reviewed. No independent loader, rules engine, enable/disable state, or platform-specific rule format.

## Candidate baseline

- Read relevant existing code, specs, callers, and dependencies before adding a new implementation or package.
- Choose the simplest implementation satisfying the complete current requirement; no speculative abstraction, configuration, or unrelated changes.
- Build in verifiable end-to-end slices without using incremental delivery to omit agreed requirements or leave fake completion.
- Keep responsibilities and ownership clear; extract boundaries when demonstrated by the code, not by imaginary future scale.
- Reuse suitable project code, existing dependencies, and standard-library facilities before adding new dependencies. When a new dependency is justified, assess maintenance, license, security, and integration cost.
- Prefer maintainable, proven designs for consequential architecture decisions; do not require web research for every small edit.
- Preserve user changes and data. Evaluate consumer compatibility and migration needs before removing contracts or persisted structures.
- Verify the changed behavior through the nearest real entry point; report what ran and disclose unverified gaps.

These consolidate the post rather than copying its absolute formulations. Verification and data preservation are proposed safety additions, not claims about its eight rules.

## Optional candidates

- **Clean cutover**: projects may explicitly retire specified interfaces and remove obsolete shims after migrating consumers. Not permission to drop stored data or skip required migrations. Side-project status alone is insufficient authorization.
- **Production compatibility**: explicit public API and persisted-format compatibility windows, migrations, and rollback/recovery review.
- **Dependency governance**: team-specific approval and license constraints beyond the default reuse-first baseline.
- **Architecture research**: documented comparison of established solutions for substantial architectural choices, not every task.

TDD remains a workflow selection because the repository already has a `tdd` workflow. Language/framework-specific conventions remain specs rather than universal defaults.

## Alternatives

### A. Content-first adoption (selected)

Add the concise default baseline and a catalog of optional declarations with an explicit source-to-project adoption contract. A rule states applicability, constraints, rationale where needed, and observable compliance criteria—not a sequence of execution steps.

Adoption means copying selected content into the declared project Rules location, linking it in the Rules index, and including applicable content in existing task contexts. Removal is a reviewed document/reference edit, not a toggle.

### B. First-class managed Rules (not selected)

An independent registry resource, selection lifecycle, and policy-management interface were considered and rejected for this task. They would turn a declarative content category into an unnecessary product subsystem.

### C. Single expanded default template

Put all recommendations into the default instructions. Reject: increases context cost, mixes conflicting policies, and applies side-project preferences to production projects.

## Compatibility and validation expectations

- Blank init must continue creating no project spec unless the user explicitly approves changing that contract.
- Existing customized instruction/spec files must survive updates; conflicts must be visible, not silently merged by semantic guesswork.
- Unadopted reference documents must not become project constraints through a broad include. There is no separate disabled/enabled state.
- Verify actual loading for each claimed main-session and sub-agent integration; do not assume all tools automatically read `AGENTS.md`.
- Compare generated preset/source bytes where applicable and exercise fresh init plus modified-project update in isolated fixtures.
- Version pinning and source attribution are required for externally adopted material; do not copy a third-party AGENTS document without checking its license.

## Decision

Content-first adoption is approved. Rules and Specs share declaration/context mechanisms with an explicit directory boundary. Sibling directories and manual adoption are the selected implementation; the alternatives below remain out of scope.

## Directory alternatives

**A. Sibling directories (recommended):** `.memerig/rules/` for behavioral constraints and `.memerig/spec/` for project contracts. Clear semantics and room for independent catalog organization. Existing path validation, discovery, and context loading must be checked and minimally adapted if needed.

**B. Nested category:** `.memerig/spec/rules/` for Rules, alongside package/layer specs. Likely less integration work, but Rules become a subcategory of Specs rather than a peer. Do not claim this is zero-code until path handling is inspected.

Recommended source and installed layout:

```text
packages/templates/assets/memerig/rules/
  index.md                  # default entry: core only
  core.md                   # sole authored default baseline
marketplace/rules/
  README.md                 # optional catalog; not active instructions
  clean-cutover.md
  production-compatibility.md
  dependency-governance.md
  architecture-research.md

consumer/.memerig/
  rules/
    index.md                # adopted declarations and applicability
    core.md                 # default baseline
    production-compatibility.md  # example: explicitly adopted
  spec/
    <package>/<layer>/...
```

These are the approved source and installed directories. Do not ship the whole optional catalog into the project's active Rules directory. Do not duplicate `core.md` between marketplace and bundled sources.

## Concrete adoption alternatives

1. **Reviewed manual adoption (recommended for the selected content-first scope).** Copy one rule from a recorded source revision to `.memerig/rules/<id>.md`, tailor its applicability, and add a relative link in `rules/index.md`. Main-session entry instructions route to that index; relevant implement/check manifests explicitly include the selected declaration, not just a link-containing index. Verify actual context output. Remove the document and its index/manifest references together. Upgrade by comparing the recorded source revision with the new version, preserving local changes.
2. **Template-composed adoption.** A team distributes an already-selected Rules directory with its project template. Convenient for repeatable team defaults, but generic spec presets currently target `.memerig/spec/`; they cannot be described as installing sibling Rules without an explicit template packaging change. This is an alternative scope, not current behavior.
3. **Init-time selection.** Add a checkbox or command option to copy selected rule documents and render the index, without runtime state or an engine. This is still declarative content but adds CLI, packaging, and upgrade contracts; not part of the currently selected content-first scope unless approved separately.

## Index and ownership contract

- `rules/index.md` lists adopted declarations with applicability; it is not a registry of disabled rules. Defaults reference only `core.md`.
- Default entry instructions must reach `rules/index.md` in main sessions. Sub-agents receive applicable rule bodies through the existing context pipeline; no assumption that Markdown links are transitively loaded.
- Broad discovery must not load marketplace reference content as project policy.
- Core templates use existing managed-file/update ownership and conflict handling. Copied optional declarations are project-owned and excluded from managed template collection. Project-edited defaults preserve their old receipts and use skip/`.new` conflict handling; explicit `--force` may overwrite them.
- The sibling layout preserves blank initialization's `.memerig/spec/README.md` without adding project conventions, while adding Rules files. Document and test this distinction instead of claiming initialization output is unchanged.

