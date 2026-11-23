/**
 * Link this checkout's CLI onto the global PATH.
 *
 * `memerig-core` is declared as `workspace:*`, so a plain global install of the
 * package from outside the workspace cannot resolve it. `npm link` does not
 * install dependencies — it only writes the `<prefix>/node_modules/memerig`
 * symlink and the `memerig` / `mrig` shims — so the workspace dependency keeps
 * resolving through `packages/cli/node_modules`.
 *
 * The caller (`pnpm install:global`) builds first, so the link never serves a
 * stale `dist/`.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = fileURLToPath(new URL("..", import.meta.url));
const isWindows = process.platform === "win32";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: cliRoot,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

// `npm.cmd` cannot be spawned directly on Windows (EINVAL); go through cmd.exe,
// matching how `commands/upgrade.ts` invokes npm.
if (isWindows) {
  run("cmd.exe", ["/d", "/s", "/c", "npm link"]);
} else {
  run("npm", ["link"]);
}

const { name, version } = JSON.parse(
  readFileSync(path.join(cliRoot, "package.json"), "utf-8"),
);
const probe = spawnSync(isWindows ? "where" : "which", [name], {
  encoding: "utf-8",
});

const resolved = (probe.stdout ?? "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

console.log(`\n${name}@${version} linked: ${cliRoot}`);
if (resolved.length > 0) {
  console.log(`  on PATH: ${resolved.join(", ")}`);
} else {
  console.warn(
    `  ⚠ "${name}" is not on PATH yet — prepend ${"$(npm config get prefix)"} (Windows) or the npm global bin directory to PATH, then open a new shell.`,
  );
}
console.log(
  "  Do not run `memerig upgrade`: it installs from the registry and replaces this symlink.\n",
);
