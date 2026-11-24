/**
 * The release bump script must run main() when invoked directly on every host.
 *
 * Windows argv paths are `C:\...`; the old guard compared `import.meta.url`
 * (`file:///C:/...`) with `file://C:\...` and silently skipped the bump. This
 * test executes the real script from a temporary package tree, so it fails on
 * Windows if the entry guard regresses. Importing the module must stay inert.
 */

import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT = path.resolve(__dirname, "../../scripts/bump-versions.js");

describe("bump-versions direct entry", () => {
  let tmp = "";
  let scriptPath = "";

  function setup(): void {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "memerig-bump-entry-"));
    scriptPath = path.join(tmp, "packages", "cli", "scripts", "bump-versions.js");
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    fs.copyFileSync(SCRIPT, scriptPath);

    for (const [pkg, name] of [
      ["cli", "memerig"],
      ["core", "memerig-core"],
    ]) {
      fs.mkdirSync(path.join(tmp, "packages", pkg), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, "packages", pkg, "package.json"),
        JSON.stringify({ name, version: "0.7.4", type: "module" }, null, 2) + "\n",
        "utf-8",
      );
    }
  }

  function versionOf(pkg: "cli" | "core"): string {
    return JSON.parse(
      fs.readFileSync(path.join(tmp, "packages", pkg, "package.json"), "utf-8"),
    ).version;
  }

  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("bumps both packages when executed directly", () => {
    setup();

    const stdout = execFileSync(process.execPath, [scriptPath, "patch"], {
      cwd: tmp,
      encoding: "utf-8",
    });

    expect(stdout.trim()).toBe("0.7.5");
    expect(versionOf("cli")).toBe("0.7.5");
    expect(versionOf("core")).toBe("0.7.5");
  });

  it("does not bump when imported as a module", () => {
    setup();

    const stdout = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        // Intentional module-loading boundary: a static import would run the
        // script's top-level code in this process instead of a clean child.
        `await import(${JSON.stringify(pathToFileURL(scriptPath).href)})`,
      ],
      { cwd: tmp, encoding: "utf-8" },
    );

    expect(stdout.trim()).toBe("");
    expect(versionOf("cli")).toBe("0.7.4");
    expect(versionOf("core")).toBe("0.7.4");
  });
});
