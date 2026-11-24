# Project Rules

Rules declare behavioral constraints; `.memerig/spec/` describes this project's
concrete architecture and conventions. Read both where applicable. Conflicting
requirements need an explicit scope decision, not an assumed directory precedence.

## Adopted rules

| Rule | Applies to |
| --- | --- |
| [Core engineering](./core.md) | All project work |

Read the applicable rule bodies before working. This index is a routing document,
not a substitute for those bodies. For delegated work, include each applicable
rule file in the task's `implement.jsonl` and `check.jsonl` using the existing
`task.py add-context` command; Markdown links are not automatically expanded.

## Optional adoption

Only explicitly adopted documents belong in this directory. Choose individual
rules from [the optional catalog](https://github.com/blackplume233/MemeRig/tree/main/marketplace/rules),
review them at a pinned revision, and copy selected files here without overwriting
existing content. Record the source revision and project-specific applicability,
then add their links to the table above and to relevant task context manifests.
Do not load the entire catalog or treat unselected examples as project policy.

Keep local changes when reviewing upstream updates. To stop using a rule, remove
its index and active task manifest references along with the document. MemeRig
updates use the existing managed-file conflict handling for the bundled core and
index; review conflicts rather than forcing an overwrite of your adopted entries.
