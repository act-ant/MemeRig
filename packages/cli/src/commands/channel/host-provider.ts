/**
 * Which worker runtime should `memerig channel spawn` start?
 *
 * An agent definition (`.memerig/agents/<name>.md`) describes a *role* — the
 * system prompt, the description, labels. It is deliberately provider-agnostic:
 * nothing in a role says "run me on Claude Code" or "run me on Codex". The
 * runtime is an invocation concern, resolved in this order:
 *
 *   1. `--provider` — explicit, wins over everything.
 *   2. `MEMERIG_CHANNEL_PROVIDER` — project/CI override, set once instead of
 *      threading a flag through every call site.
 *   3. The host agent that invoked the spawn, sniffed from its own env markers
 *      (a subagent should run on the same runtime as the front-end agent the
 *      user is talking to).
 *   4. `MEMERIG_PLATFORM` — the override the Python scripts already honour.
 *   5. The repository's configured platforms, when exactly one of them is a
 *      worker provider.
 *   6. `provider:` in the agent frontmatter — legacy definitions written before
 *      roles were provider-agnostic. Kept as a last resort so old agent files
 *      keep working; new definitions should omit it.
 *
 * When none of those resolve, `spawn` fails with an explicit message rather
 * than guessing: starting the wrong CLI silently is worse than an error.
 */

import { getConfiguredPlatforms } from "../../configurators/index.js";
import { isProvider, type Provider } from "./adapters/index.js";

/**
 * Env markers that identify the AI CLI currently driving the session.
 *
 * Only providers with a worker adapter can be inferred here; other platforms
 * (cursor, gemini, …) have no worker runtime, so they fall through.
 */
const HOST_ENV_MARKERS: readonly (readonly [Provider, readonly string[]])[] = [
  [
    "claude",
    [
      "CLAUDECODE",
      "CLAUDE_CODE_ENTRYPOINT",
      "CLAUDE_CODE_SSE_PORT",
      "CLAUDE_ENV_FILE",
    ],
  ],
  [
    "codex",
    ["CODEX_HOME", "CODEX_THREAD_ID", "CODEX_SANDBOX", "CODEX_SESSION_ID"],
  ],
];

export interface HostProviderLookup {
  /** Environment to inspect. Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Repository root used for configured-platform detection. */
  cwd?: string;
  /** Injectable platform lookup (tests). Defaults to the real configurator. */
  configuredPlatforms?: () => Iterable<string>;
}

function readEnv(env: NodeJS.ProcessEnv, key: string): string {
  return (env[key] ?? "").trim();
}

/**
 * Resolve the host agent's worker provider, or `undefined` when the host is
 * unknown or has no worker adapter.
 */
export function detectHostProvider(
  lookup: HostProviderLookup = {},
): Provider | undefined {
  const env = lookup.env ?? process.env;

  const override = readEnv(env, "MEMERIG_CHANNEL_PROVIDER").toLowerCase();
  if (override && isProvider(override)) return override;

  for (const [provider, markers] of HOST_ENV_MARKERS) {
    if (markers.some((marker) => readEnv(env, marker) !== "")) return provider;
  }

  const platform = readEnv(env, "MEMERIG_PLATFORM").toLowerCase();
  if (platform && isProvider(platform)) return platform;

  const configured = [
    ...(lookup.configuredPlatforms?.() ??
      getConfiguredPlatforms(lookup.cwd ?? process.cwd())),
  ].filter((id): id is Provider => isProvider(id));
  if (configured.length === 1) return configured[0];

  return undefined;
}
