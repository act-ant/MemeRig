# Optional Rules Catalog

Rules are short, declarative constraints that a project adopts when its conditions match. This directory is a catalog, not an active ruleset: nothing here applies to a project until someone copies a document into `.memerig/rules/`, records its applicability, and references it from task context.

[简体中文](./README_CN.md) · [Marketplace overview](../README.md)

## Rules and Specs

`.memerig/rules/` and `.memerig/spec/` are sibling declaration directories. They use the same Markdown and task-context mechanisms, but they answer different questions:

| Directory | Answers | Typical content | Ownership |
| --- | --- | --- | --- |
| `.memerig/rules/` | "What reusable constraint applies to this work?" | Applicability, behavioral constraints, observable compliance criteria | `core.md` and `index.md` ship as defaults; adopted catalog documents are project-owned |
| `.memerig/spec/` | "How does this repository actually work?" | Package and layer conventions, commands, architecture, compatibility promises, dependency policy | Project-owned |

The directory boundary is semantic, not a priority order. A Rule does not automatically override a Spec, another Rule, or a recorded project decision, and a Spec does not automatically erase a Rule. Conflicts are resolved and recorded explicitly.

Rules are declarations, not Skills or Workflows. They do not define a sequence of tools or steps. Use a Skill for a procedure, and keep TDD as the existing workflow choice instead of encoding a second process toggle here.

## Catalog

| Rule | Adopt when | File |
| --- | --- | --- |
| Clean cutover | You are retiring named internal interfaces and compatibility shims after migrating their consumers | [`clean-cutover.md`](./clean-cutover.md) |
| Production compatibility | You are changing a published API, CLI contract, protocol, or persisted format | [`production-compatibility.md`](./production-compatibility.md) |
| Dependency governance | You add, remove, or upgrade a production dependency and need approval, license, and security constraints | [`dependency-governance.md`](./dependency-governance.md) |
| Architecture research | A consequential, hard-to-reverse design choice needs a documented comparison of established options | [`architecture-research.md`](./architecture-research.md) |

These four are optional. Adopt only the ones that match the project; do not copy the whole catalog "just in case".

## What ships by default

The normal MemeRig template pipeline delivers two default files separately from this catalog:

- `.memerig/rules/index.md` — the project's Rules entry point. It lists `core.md` and any rules the project adopts.
- `.memerig/rules/core.md` — the short default baseline. It is always relevant.

The optional documents in this catalog are not installed by the npm CLI by default: neither `memerig init` nor `memerig update` copies them. They are not listed in `marketplace/index.json` and there is no installer flag or rule registry for them. `memerig init --template` remains for project Spec presets; it does not install these declarations. Adoption is the manual, reviewed copy described below.

## User-level rules (personal, not project adoption)

Keep cross-project personal rules in `~/.memerig/rules/*.md`. They are not part of this catalog and the CLI never installs or modifies them. Each file may set `load` in YAML frontmatter:

- `load: always` — the body is injected into session and sub-agent context.
- `load: index` or no frontmatter — the path is listed and read on demand.

User rules are peers of project rules, not an override layer. Do not add them to task manifests or treat them as adopted project declarations.

## Adopt a rule manually

Adoption is a reviewed copy into project-owned files, not an installation.

1. **Choose one rule and pin a source revision.** Use a release tag or a full commit SHA, not a moving branch.

   ```bash
   git clone https://github.com/blackplume233/MemeRig.git /tmp/memerig
   git -C /tmp/memerig checkout <release-tag-or-commit>
   ```

2. **Check the destination before copying.** If `.memerig/rules/production-compatibility.md` already exists, stop and merge deliberately. Re-adoption and upgrading are reviewed merges, not copies.

3. **Copy only the selected document, with an overwrite guard.** Do not copy this guide or unselected rules. The command below fails instead of replacing an existing file.

   ```bash
   if test -e .memerig/rules/production-compatibility.md; then
     echo "Already exists: merge deliberately instead of overwriting." >&2
     false
   else
     mkdir -p .memerig/rules
     cp /tmp/memerig/marketplace/rules/production-compatibility.md .memerig/rules/
   fi
   ```

   PowerShell:

   ```powershell
   $target = '.memerig\rules\production-compatibility.md'
   if (Test-Path $target) { throw "Already exists: merge deliberately instead of overwriting." }
   New-Item -ItemType Directory -Force .memerig\rules | Out-Null
   Copy-Item C:\temp\memerig\marketplace\rules\production-compatibility.md $target
   ```

4. **Record attribution and the source revision.** Keep the document's `Provenance` section and add a plain note at the top or in the index:

   ```markdown
   Adopted from MemeRig `marketplace/rules/production-compatibility.md` at `<release-tag-or-commit>`.
   ```

5. **Adapt the scope, not the guarantees.** Edit `Applies to` and the scope examples to name the project's real services, packages, interfaces, and environments. If a constraint cannot hold, record the exception and its reason; do not delete the constraint and leave a clean-looking rule.

6. **Add the rule to the project's Rules index.** Link the body relatively and state its applicability; do not paste the body into the index.

   ```markdown
   - [Production compatibility](./production-compatibility.md) — public HTTP API and the CLI's JSON output
   ```

7. **Put the exact file in task manifests.** The implement and check sub-agents receive the files listed in `implement.jsonl` and `check.jsonl`. Add the rule body itself, not only the index:

   ```bash
   python3 .memerig/scripts/task.py add-context <task> implement .memerig/rules/production-compatibility.md "compatibility window for the public API"
   python3 .memerig/scripts/task.py add-context <task> check     .memerig/rules/production-compatibility.md "verify the public API compatibility window"
   ```

   `<task>` may be the task name or `.memerig/tasks/<dir>`. Use the Python 3 executable your project uses: `python3` on macOS/Linux, usually `python` on Windows (`py -3` also works), or the value of `MEMERIG_PYTHON_CMD`. MemeRig's generated instruction files show the host-appropriate command; use the same one here.

8. **Validate first, then commit what the project tracks.** Run:

   ```bash
   python3 .memerig/scripts/task.py validate <task>
   ```

   Then commit the adopted rule and its `rules/index.md` entry together. Commit `implement.jsonl` and `check.jsonl` only when `.memerig/tasks/` is tracked; task directories may be local or gitignored, so follow the project's task policy.

## How a rule reaches agents

There is no enable/disable state. A rule reaches work because its document is present, linked from `.memerig/rules/index.md`, and listed in the relevant task manifest; the index is not a registry of disabled rules.

- **Main session.** Managed entry instructions point the main session at `.memerig/rules/index.md`. The index is navigation: the session reads it and then opens each linked rule body that applies to the work.
- **Sub-agents.** The implement/check hooks materialize the files listed in the task's JSONL manifests. They do not follow Markdown links. Listing only `.memerig/rules/index.md` does not give a sub-agent the body; list the exact `.memerig/rules/<id>.md` file in each manifest whose role needs it.

Adoption is not proof that every host loads the same context. If a platform does not run the hooks, verify what it actually injects and add a project-owned instruction that tells its main session to read the index and the selected rule bodies.

## Conflicts and scope

Rules and Specs do not have a global precedence order. Decide the boundary explicitly and write it where the work will see it: task `design.md`, the project Spec, or an applicability note beside the index entry.

- **Clean cutover vs production compatibility.** An internal serializer shim can be removed immediately after its consumers move. A published response field that the same change would delete keeps its support window, gets a migration path, and is removed on a stated schedule. The boundary is the interface's audience, not the repository or the developer's preference.
- **Architecture research vs a simplest-sufficient baseline.** Choosing a date-formatting helper does not need a design study. Choosing a primary datastore or a message bus does. Apply the research obligation only to consequential, hard-to-reverse decisions, and keep the simplest sufficient implementation within the chosen option.
- **Dependency governance vs production compatibility.** A security upgrade may be expedited, but it still needs an explicit compatibility decision for the public contract it changes. "Security" does not silently waive the support window, and "compatibility" does not silently block a critical patch.

If no honest boundary exists, narrow or decline one of the rules. Do not claim both apply and then pick the convenient one during review.

## Update and remove

**Update.** Compare the recorded source revision with the new catalog version, read the diff, and port only the changes that fit the project. Preserve local applicability edits and scope notes. A catalog change is not a subscription: neither `memerig update` nor the marketplace edits an adopted document automatically. `memerig update` treats `core.md` and `index.md` as managed default files. If you added adopted-rule links to `index.md`, the update sees a locally modified file and uses the existing conflict flow: keep your version (skip) or save the upstream default as a `.new` review copy. `--force` selects overwrite and can replace your edited `core.md` or `index.md`, so review it before use. Manually adopted documents are not collected as bundled templates.

```bash
git -C /tmp/memerig fetch --tags
git -C /tmp/memerig diff <recorded-revision> <new-revision> -- marketplace/rules/production-compatibility.md
```

**Remove.** Delete the adopted document, its index link and applicability note, and its entries in active `implement.jsonl` and `check.jsonl` together. Re-run `task.py validate` for affected tasks. Removal is an ordinary reviewed change, not a toggle. Removing a rule never authorizes deleting data, dropping a persisted contract, or reverting unrelated project edits.

## Source and attribution

These rules were inspired by a public post: <https://x.com/murong97358/status/2124531122826854873>.

That post describes side-project preferences and warns that its compatibility advice nearly caused destructive database changes. MemeRig does not adopt its absolute formulations; the catalog narrows them into scoped decisions with explicit trade-offs. MemeRig has not independently verified the author's identity, the token-expenditure claims, or the incident described there. The post is commentary, and no reuse license was established for it: every rule file is original MemeRig text, not a translation or verbatim copy. The MemeRig repository, including this catalog, is distributed under AGPL-3.0; see the repository [`COPYRIGHT`](../../COPYRIGHT) and [`LICENSE`](../../LICENSE) files.

The default `core.md` baseline is authored and maintained separately from this catalog. Its presence does not mean any optional rule here has been adopted.
