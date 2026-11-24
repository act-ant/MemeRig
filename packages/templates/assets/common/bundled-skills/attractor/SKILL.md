---
name: attractor
description: "Use only when the current project or template explicitly adopts repository-attractor construction, or when the user explicitly asks to construct or update the project's long-term design direction. Not for ordinary task goals, acceptance criteria, or generic architecture questions."
---

# Repository Attractor

This skill is an entry point to an **adoptable** project practice. The method
itself lives in project-owned instructions; this skill must not invent policy
or run a parallel interview.

## 1. Confirm adoption or an explicit request

Read the current project instructions before doing anything else:

- `.memerig/workflow.md` for the active workflow's setup and timing;
- the selected Spec entry documents, such as `.memerig/spec/README.md`,
  `.memerig/spec/index.md`, or the preset's own README/index.

Then classify the situation:

| Situation | Action |
| --- | --- |
| The selected template explicitly adopts attractor construction | Resolve and follow its method |
| The template names a custom method or guide | Follow that method; do not substitute the default |
| The template is silent or declines the capability, and the user did not ask | Do nothing attractor-specific; no questions, project files, warnings, or tasks |
| The user explicitly requests attractor work in a non-adopting project | Help with the current work without silently making it permanent policy |
| Active instructions conflict about adoption or method | Surface the concrete conflict; do not decide by file or install order |
| The designated method guide is missing or unreadable | Report the broken reference; do not silently fall back to the default |

An installed skill, a bundled guide, an old `.memerig/spec/attractor.md`, or a
directory entry is **not** adoption. File presence alone never activates
construction or context injection.

## 2. Resolve the active method

- If the adopting instructions reuse the default method, read the actual
  `.memerig/attractor-guide.md` file and follow it. It is self-sufficient; no
  platform skill is required.
- If the template extends the default method, read both the extension and the
  default guide only to the extent the extension says it applies.
- If the template supplies its own method, read that document or inline
  instruction. Its timing, questions, and cadence are authoritative.
- If the user explicitly invokes the capability without a project method, use
  the default guide for the current work, and say that it is not a permanent
  adoption.

Do not add a second interview when the selected method already schedules one.
Do not copy generic guidance into the user's READMEs or invent project values.

## 3. Work with the adopted method

Follow the selected method's contract. When the selected method is the default
method, that means:

- Ask one focused question about the next consequential uncertainty, using
  concrete choices or examples when the user's intent is vague.
- Treat explicit user statements and decisions as confirmed; record them
  without asking for the same permission again.
- Label AI inferences as proposals. Calibrate any inferred repository-wide
  meaning before adopting it.
- Allow partial progress, open questions, and deliberate deferral. Never
  fabricate direction to complete a template.
- Keep `.memerig/spec/attractor.md` separate from current code contracts.
  Current implementation is evidence for questions, not proof of the desired
  future.
- Do not create or start tasks automatically. Existing task consent and
  planning gates still apply.
- Direction guides future design within approved task scope. It does not
  authorize repo-wide rewrites or enforcement of unadopted proposals.

A custom method may organize construction differently. Its timing, questions,
and cadence win; do not add this default interview on top of it. Across methods,
keep the amendment distinction below and the loading rules in the next section.

For a later design conversation, propose a focused amendment with its
rationale, distinguished from confirmed direction. A one-off implementation
exception is not a repository-wide change unless the user confirms that
meaning.

## 4. Load actual content

When adopted guidance or an explicit task reference makes the attractor
relevant, read the actual `.memerig/spec/attractor.md` content. A link, index
entry, or README reference is not loaded content.

- For delegated work, include the file in the existing `implement.jsonl` /
  `check.jsonl` manifests, using the existing task context mechanism.
- For inline work, read the file directly.
- Do not inject it into unrelated tasks or load it merely because the file
  exists.
- Preserve current executable contracts and approved task scope when direction
  and implementation differ; surface a real conflict instead of rewriting
  either side silently.

When the project does not adopt the capability, stop here. Old documents may
remain preserved without becoming mandatory context.

## 5. Reference routing

Read [references/construction.md](references/construction.md) only when:

- the selected method is the default method or explicitly reuses it, **and**
  deeper examples would help with greenfield intent, existing-code evidence,
  UI direction, deferral, or an amendment; or
- the user explicitly asks for examples.

The reference illustrates the default method. It is optional and is not a
second method, a preset project vision, or content to copy into a user's
attractor.

## Guardrails

- Never infer adoption from file existence.
- Never warn about a missing attractor in a non-adopting project.
- Never require an attractor file as a completion or onboarding gate; adopted
  construction may invite direction work but must allow deferral.
- Never relabel ordinary goals, acceptance criteria, or design tasks as
  attractors.
- Never let an attractor file override explicit user instructions, approved
  task scope, or current executable contracts.
- Never overwrite user-authored direction; amend it with confirmation and
  preserve it across template changes.
