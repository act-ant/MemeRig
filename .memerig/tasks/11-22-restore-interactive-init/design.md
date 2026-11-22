# Design — Restore Interactive Init Guidance

## Decision Summary

| Question | Decision | Why |
| --- | --- | --- |
| Where does prompt logic live? | Pure/injectable helpers in `commands/init.ts`, near the existing `handleReinit` helpers | Tests run without a TTY; no inquirer dependency in assertions |
| What does "no platform" mean? | Explicit mode: **AGENTS.md open protocol**. Full workflow structure, no platform dirs, console notice | Owner requirement; AGENTS.md is the platform-agnostic protocol entry point |
| Does `-y` prompt? | No. Non-interactive defaults to the open-protocol mode | `-y` must stay deterministic for CI; scripts already pass platform flags |
| Non-TTY without `-y`? | Same as `-y`, never prompt | Prevents inquirer `ERR_USE_AFTER_CLOSE` (observed when stdin closes mid-prompt) |
| Spec picker gate | Any first init, interactive, no `--template`/`--registry` | Removes the `useMarketplace` coupling that hid the picker |
| Spec picker contents | Bundled presets first (offline-safe), then remote marketplace entries when reachable, then `custom (enter a registry source)` | Fresh installs must work offline; marketplace adds breadth |
| `from scratch` selection | Creates the project-type spec scaffolds (`createSpecTemplates`) | Pre-refactor behavior; today plain init creates no `.memerig/spec/` at all |
| Bundled preset selection | `installBuiltinSpec()` into `.memerig/spec/`, skip generic scaffolds | Preset replaces scaffolds, mirrors `--template <builtin>` today |
| `baseOnly` | Removed from the `tools.length === 0` condition | Open-protocol mode needs workspace, spec, channel agents, `.gitattributes` to be usable |

## Contracts

### Tool resolution (exported, unit-tested)

```ts
export type InitToolMode = "explicit" | "interactive" | "open-protocol";

export function resolveInitTools(params: {
  explicitTools: string[];              // from --claude / --cursor / ...
  interactive: boolean;                 // !options.yes && stdin.isTTY
  promptPlatforms: () => Promise<string[]>;
}): Promise<{ tools: string[]; mode: InitToolMode }>;
```

Rules, in order:
1. `explicitTools.length > 0` → `{ tools: explicitTools, mode: "explicit" }`. Flags always win, with or without `-y`.
2. `!interactive` → `{ tools: [], mode: "open-protocol" }`.
3. Otherwise prompt; `mode` is `open-protocol` when the user checks nothing.

### Spec choice construction (exported, unit-tested)

```ts
export type SpecChoice = { name: string; value: string };

export function buildSpecTemplateChoices(
  builtins: readonly { id: string; name: string }[],
  remote: readonly { id: string; name: string }[],
  options?: { includeCustom?: boolean },
): SpecChoice[];
```

Order: `from scratch (default)` → builtins (missing from remote; dedup by id) → remote-only entries → `custom (enter a registry source)` when `includeCustom`.

## Data Flow (first init)

```
flags ──► explicitTools ──┐
                          ├─► resolveInitTools ─► tools[], mode
stdin.isTTY && !-y ───────┘        │
                                   ├─ "open-protocol" → console notice (AGENTS.md)
                                   └─ otherwise → configurePlatform() per tool (unchanged)

--template ──► selectedBuiltinSpec (builtin id) | selectedTemplate (marketplace id)
                │                                       │
no flags, interactive ──► spec picker ──────────────────┘
                │
                └─ "blank" → createSpecTemplates(projectType)

createWorkflowStructure({
  skipSpecTemplates: useRemoteTemplate || !!selectedBuiltinSpec,
  packages: useMarketplace ? monorepoPackages : undefined,
})
```

## Boundaries

- `handleReinit` (already-initialized fast path) is untouched: it has its own platform menu and its own gates.
- `--registry` / marketplace download path is untouched apart from being reused by the picker when a marketplace id is chosen.
- `AGENTS.md` stays a static managed block; only a protocol sentence is added so `memerig update` cannot desynchronize per-project variants.

## Compatibility / Rollback

- `memerig init -y --<platform>` keeps its file set; only `-y` **without** flags changes (core-only → open-protocol with full structure).
- Rollback is a single revert of the init commit; no migrations, no schema, no version bump required.
- Users who relied on 37-file core-only installs still get the same protocol files plus spec/workspace/agents — strictly additive.
