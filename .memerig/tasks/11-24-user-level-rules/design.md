# User-level Rules design

## Boundary

User-level Rules are a second **location** for the same declarative category, not a new rules engine. Only `rules` gain this source. Project Spec/Tasks/Skills remain project-owned. Mixed semantics are left to the user: project and user rules are peers, and MemeRig performs no precedence or conflict resolution.

## Storage and format

```
~/.memerig/rules/
├── language.md      # ---
│                    # load: always
│                    # ---
│                    # # Response language
│                    # Reply in Chinese.
└── monorepo.md      # ---
                     # load: index
                     # ---
                     # # Monorepo specifics
                     # ...
```

- Directory: `Path.home() / ".memerig" / "rules"` (built from `DIR_WORKFLOW` + `DIR_RULES`, so directory renames stay consistent).
- Scan only top-level `*.md`; sort case-insensitively by filename for deterministic output.
- Frontmatter is a leading `---` block. Only the top-level `load` key is read; other keys are ignored.
- `load: always` → inject body (frontmatter stripped). `load: index`, missing, or unknown → index entry only.
- Title: first `^#\s+` heading in the body; fallback to the filename stem.
- No size cap: `always` files are inlined verbatim; documentation tells users to keep them short.

## Context shape

Text (`get_context_text`), appended after Git sections and before task sections:

```
## USER RULES
Source: /home/u/.memerig/rules
User-level rules apply across projects and are peers of project rules, not an override layer.

### language.md — Response language  [load: always]
Reply in Chinese.

### monorepo.md — Monorepo specifics  [load: index]
Path: /home/u/.memerig/rules/monorepo.md
Read this file when its applicability covers the work.
```

The whole section is omitted when no readable rule exists. Unreadable files are skipped without aborting session context.

JSON (`get_context_json`) adds, only when rules exist:

```json
"userRules": {
  "directory": "/home/u/.memerig/rules",
  "rules": [
    {"file": "language.md", "title": "Response language", "load": "always", "content": "Reply in Chinese."},
    {"file": "monorepo.md", "title": "Monorepo specifics", "load": "index"}
  ]
}
```

`content` is present only for `always` rules, matching what the text path injects.

## Routing

- `get_user_rules_text` is the single parser/renderer for the shared SessionStart hook, `get_context.py`, and the OMP extension.
- The class-1 sub-agent hook (`inject-subagent-context.py`) appends the same block to implement, check, finish, and research prompts, so delegated work sees the same `always` bodies and index paths.
- `AGENTS.md` managed block and `workflow.md` Rules System describe the user-level location and the two load modes.
- Pull-based sub-agent prelude (`buildPullBasedPrelude`) tells sub-agents to read `~/.memerig/rules/*.md` themselves, honoring `load`.
- `before-dev`, `check`, and `start` guidance adds the same read step.
- User rules are explicitly excluded from task manifests: they are local, not shareable project context.

## Lifecycle

`init`, `update`, and `uninstall` never read-modify-write `~/.memerig/rules/`. No templates, receipts, or hashes are created there. Absence of the directory is the default and produces no output.

## Failure handling

- Missing/unreadable rule file → skip.
- Malformed frontmatter without a closing fence → treat the whole file as body, `load: index`, title from the first heading.
- Unknown `load` value → `index`.
- Non-UTF-8 file → skip (Python read raises `UnicodeDecodeError`, caught with `OSError`).

## Verification

- New Python-backed integration test isolates HOME/USERPROFILE, runs the real `session_context` entry points, and covers always/index/unknown/non-md/absent-directory cases plus stable ordering.
- Existing rules routing tests must continue to pass.
- No CLI command surface changes; no migration manifest is required for this feature increment.
