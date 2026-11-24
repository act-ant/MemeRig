---
name: spec-bootstrap
description: "Bootstrap project-specific MemeRig coding specs with a platform-neutral single-agent workflow. Use when creating or refreshing .memerig/spec guidelines, analyzing a codebase with GitNexus, ABCoder, or source inspection, decomposing package/layer spec work, and writing real codebase-backed spec docs without placeholder text. Follow the selected template's setup objectives; introduce desired-direction work only when that template adopts it."
---

# MemeRig Spec Bootstrap

Use this skill to create or refresh `.memerig/spec/` guidelines from the real codebase. One capable agent owns the full loop: analyze the repository, choose the spec boundaries, write the docs, and verify the result. The workflow does not depend on a specific host, CLI, or agent brand.

## Workflow

1. Confirm MemeRig is initialized and inspect the current `.memerig/spec/` tree.
2. Read the selected template's objective before choosing scope: `.memerig/workflow.md`, the current Spec entry document (`.memerig/spec/README.md`, a preset README/index, or the template's own instructions), and any explicitly adopted guide. Follow that objective and adoption choice.
3. Analyze the repository architecture with the best available tools: GitNexus, ABCoder, language tooling, and direct source reads.
4. Decompose the spec work by package and layer only when that reflects the actual codebase.
5. Fill or reshape the code-spec files with concrete patterns, file paths, examples, and anti-patterns from the project.
6. If the selected template adopts desired-direction construction, treat it as a distinct output under its designated method and document. Do not relabel ordinary goals, acceptance criteria, task requirements, or aspirational notes as an attractor. If the template does not adopt it, do not introduce one.
7. Verify that the final specs are internally consistent and contain no template placeholders.

## Reference Routing

| Need | Read |
|------|------|
| Repository architecture analysis | [references/repository-analysis.md](references/repository-analysis.md) |
| Spec work decomposition and task planning | [references/spec-task-planning.md](references/spec-task-planning.md) |
| Writing high-signal MemeRig spec files | [references/spec-writing.md](references/spec-writing.md) |
| Adopted desired-direction construction | The template's designated method (for example `.memerig/attractor-guide.md`) and the actual project document |
| GitNexus and ABCoder MCP setup | [references/mcp-setup.md](references/mcp-setup.md) |

## Operating Rules

- Follow the selected template's setup objectives and adoption choice. This skill supplies the analysis and writing loop, not a replacement policy for the template's documents.
- Treat preset content as a starting point, not a contract. Delete, rename, split, or add spec files when the repository calls for it.
- Prefer source-backed rules over generic advice. Every important recommendation should point at a real file or repeated local pattern.
- Keep execution single-owner by default. Optional helper agents are an implementation detail, not a requirement or user-visible dependency.
- Do not write platform-specific instructions unless the target project already standardizes on that platform.
- Do not leave placeholder text, empty headings, or copied boilerplate in `.memerig/spec/`.
- Do not convert ordinary task goals, acceptance criteria, or every aspirational statement into an attractor. Only an explicitly adopted method introduces that document.

## Done Criteria

- Code specs under `.memerig/spec/` describe the project as it exists now.
- If the selected template adopts desired-direction construction, that content lives in its designated document under the template's method: confirmed direction, proposals, and open questions remain distinct, and current contracts are not presented as future direction.
- Each relevant package or layer has practical coding guidance with real examples.
- Non-applicable template sections are removed.
- `index.md` files match the final spec file set.
- Any required setup or analysis assumptions are documented in the relevant spec or task notes.
