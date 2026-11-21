import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../bin/memerig.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, "update", ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
