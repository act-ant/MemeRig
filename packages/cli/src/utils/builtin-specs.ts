/**
 * Built-in starter spec presets.
 *
 * The canonical source for each preset is `marketplace/specs/<id>` so the
 * Marketplace entry and the release artifact ship the same bytes. The build
 * copies that tree to `dist/templates/starter-specs/<id>`; an installed CLI
 * resolves the packaged copy without network access.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Preset ids offered by the installer and listed in CLI help.
 *
 * Keep this list in sync with `marketplace/index.json` entries whose
 * `type` is `"spec"` and whose `path` is `specs/<id>`.
 */
export const BUILTIN_SPEC_IDS = [
  "learn-harness",
  "trellis",
  "game-dev",
] as const;

export type BuiltinSpecId = (typeof BUILTIN_SPEC_IDS)[number];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolution roots in priority order:
 *
 * 1. `dist/templates/starter-specs` — the packaged release copy. This is the
 *    offline path used by an installed CLI and by a built checkout.
 * 2. `marketplace/specs` — the canonical source when running from the MemeRig
 *    repository (TypeScript under Vitest, or a build whose copy step has not
 *    run). This fallback is only enabled when the ancestor directory is
 *    recognizably this repo, so an npm-installed CLI cannot accidentally read
 *    a consumer project's `marketplace/specs` tree.
 *
 * Both candidates are derived from this module's location, matching the
 * existing `templates/common/index.ts` dev-vs-compiled pattern.
 */
const repoRoot = path.resolve(__dirname, "../../../..");
const isRepoCheckout =
  fs.existsSync(path.join(repoRoot, "packages/cli/src")) &&
  fs.existsSync(path.join(repoRoot, "marketplace/index.json"));
const repoSpecRoot = isRepoCheckout
  ? path.join(repoRoot, "marketplace", "specs")
  : undefined;

const BUILTIN_SPEC_ROOTS = [
  path.resolve(__dirname, "../templates/starter-specs"),
  ...(repoSpecRoot ? [repoSpecRoot] : []),
];

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

/** Type guard for a preset id accepted by the bundled installer. */
export function isBuiltinSpecId(id: string): id is BuiltinSpecId {
  return (BUILTIN_SPEC_IDS as readonly string[]).includes(id);
}

/**
 * Resolve a bundled starter spec directory by id.
 *
 * Returns `undefined` for an unknown id or when neither the packaged copy nor
 * the repo source is present. Only ids from `BUILTIN_SPEC_IDS` are accepted, so
 * a user-supplied value can never become a path segment outside the spec root.
 */
export function getBuiltinSpecDirectory(id: string): string | undefined {
  if (!isBuiltinSpecId(id)) return undefined;

  for (const root of BUILTIN_SPEC_ROOTS) {
    const candidate = path.join(root, id);
    if (isDirectory(candidate)) return candidate;
  }

  return undefined;
}
