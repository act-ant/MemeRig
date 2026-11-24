# Reusable rule layering research

## Referenced post

Source: https://x.com/murong97358/status/2124531122826854873

The static reader was blocked; a browser successfully displayed the post body. The post recommends eight principles: no backward compatibility; simplest sufficient implementation; incremental end-to-end growth; modularity; maintained third-party libraries; checking existing dependencies first; durable architecture rather than temporary solutions; and learning from established products.

The post itself limits its advice to side projects and warns that the compatibility rule nearly caused destructive database changes. Its claims about the original author's identity, token expenditure, and incident were not independently verified. Treat it as a discussion source, not an authoritative production policy or permission to copy an upstream document.

## Repository evidence

- `marketplace/index.json`: existing entries use `spec`, `skill`, and `workflow`; no registered `rule` entry.
- `marketplace/README.md`: bundled presets are `learn-harness`, `trellis`, and `game-dev`; blank init installs no project spec. Marketplace specs support manual adoption and pinned Git revisions.
- `.memerig/spec/cli/backend/project-setup.md`: blank/no-template init installs no specs; existing files are preserved, and overwrite mode produces `.new` review copies on preset conflicts.
- `packages/templates/assets/markdown/agents.md`: managed platform entry points route agents to workflow/spec/task knowledge and preserve text outside the managed block.
- `packages/templates/assets/markdown/spec/README.md.txt`: specs intentionally start empty; task manifests explicitly reference relevant spec documents. Merely adding a Markdown file does not establish that every main agent and sub-agent reads it.
- `marketplace/specs/trellis/index.md`: reuse, boundary compatibility, closest-real-seam verification, and layer routing already exist. Avoid duplicating these under a competing convention.

## Comparable instruction patterns

1. MemeRig spec presets: project-owned, reviewable Markdown; contextual loading. Good location for adopted rule details, but adoption/loading must be explicit.
2. MemeRig workflow presets: `native` and `tdd` already express process differences. Do not introduce a second TDD control through a Rule pack.
3. Codex layered instructions: https://developers.openai.com/codex/guides/agents-md (redirected to https://learn.chatgpt.com/docs/agent-configuration/agents-md). Documentation describes root-to-working-directory loading, nested overrides, and a default combined 32 KiB limit. This supports a short entry point with scoped detail, not an always-loaded rule encyclopedia. This does not establish equivalent loading semantics in other platforms.

The attempted Cursor documentation URL redirected to its homepage; a second rules URL returned 404. No Cursor-specific behavior is inferred from those responses.

## Investigation limits

GitNexus resolved MemeRig/main, indexed 2026-11-23T04:33:23.366Z, 14 commits behind HEAD. Query returned no results with an FTS load failure; status timed out. Empty graph results are not evidence of absent code or safe changes. This planning round relies on the concrete documents above, makes no clean impact claim, and edits no product code. Before implementation, refresh graph data and inspect actual installation/context-loading symbols and their callers.

## Rule admission criteria

Default rules must be stack-neutral, cheap to apply, actionable, and compatible with data safety and existing public contracts. Context-specific preferences require explicit adoption and applicability limits. Project conventions remain project-owned. No rule grants permission to delete production data or silently override a project's compatibility requirements.
