# Implement — Restore Interactive Init Guidance

## Ordered Checklist

1. `packages/cli/src/utils/builtin-specs.ts` — export a `BUILTIN_SPECS` catalog (`id`, `name`, `description`) derived from the same catalog file as `BUILTIN_SPEC_IDS`; keep the id list derived from it.
2. `packages/cli/src/commands/init.ts`
   a. Add `InitToolMode`, `resolveInitTools()`, `promptPlatformSelection()`, `printOpenProtocolNotice()`.
   b. Replace the flag-only `tools` computation with `resolveInitTools` (explicit → non-interactive → prompt).
   c. Make `builtinSpec` reassignable (`let selectedBuiltinSpec`) and feed it from the picker.
   d. Replace the `monorepoPackages || !useMarketplace` gate with: monorepo → handled; `--template` → existing; interactive + TTY + no template request → unified picker (builtins offline, remote best-effort, custom source).
   e. `createWorkflowStructure`: `skipSpecTemplates: useRemoteTemplate || !!selectedBuiltinSpec`; drop the `baseOnly: tools.length === 0 …` argument.
   f. Install `selectedBuiltinSpec` (was `builtinSpec`) after structure creation.
3. `packages/templates/assets/markdown/agents.md` — one sentence naming the AGENTS.md open protocol (platform-agnostic entry point).
4. Tests
   - `packages/cli/test/commands/init-internals.test.ts`: `resolveInitTools` (explicit precedence, non-interactive → open-protocol, empty interactive → open-protocol, non-empty interactive → tools).
   - `packages/cli/test/commands/init-internals.test.ts`: `buildSpecTemplateChoices` (builtins when remote empty, dedup, custom slot toggle).
   - `packages/cli/test/commands/init.integration.test.ts`: `init({ yes: true })` creates `.memerig/spec/`, `.memerig/workspace/`, `.memerig/agents/`, `AGENTS.md`, and **no** platform directory; `init({ yes: true, claude: true })` unchanged.
5. `.memerig/spec/cli/backend/platform-integration.md` — document the two prompt gates + open-protocol mode in the init flow section.

## Validation Commands

```bash
pnpm --filter memerig test           # package tests (init + init-internals first)
pnpm lint && pnpm typecheck
pnpm build && pnpm sync:templates    # dogfood CLI linked globally must pick up the change
```

Manual smoke (temp dir, non-interactive):

```bash
memerig init -y                 # open-protocol: AGENTS.md, .memerig/spec, no .claude
memerig init -y --claude        # single platform unchanged
memerig init                    # PTY: platform checkbox + spec picker
```

## Review Gates

- No prompt fires when `!process.stdin.isTTY` (grep the new call sites).
- `--template <builtin>` still installs the preset and skips scaffolds.
- `-y` file list for `--claude` matches `HEAD` (compare `find | sort` before/after).

## Rollback Points

- After step 1+2: `git checkout -- packages/cli/src` (tests untouched).
- After tests: revert the test file too; no persisted state, no migrations.
