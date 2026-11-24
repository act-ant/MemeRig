/**
 * Tag detection in the shared release preflight.
 *
 * The same script gates publishing from two hosts: GitHub Actions
 * (.github/workflows/publish.yml) exports GITHUB_REF / GITHUB_REF_NAME, and
 * GitLab CI/CD (.gitlab-ci.yml) exports CI_COMMIT_TAG. A tag pipeline the
 * script cannot see refuses to publish, so both shapes are exercised here
 * through the real CLI entry point.
 *
 * The test blanks all three variables before each spawn: the suite itself runs
 * inside CI, where the host's own GITHUB_REF would otherwise leak in.
 */

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CLI_PKG = path.resolve(__dirname, "../../package.json");
const SCRIPT = path.resolve(__dirname, "../../scripts/release-preflight.js");
const VERSION: string = JSON.parse(
  fs.readFileSync(CLI_PKG, "utf-8"),
).version;

const HOST_VARS = ["CI_COMMIT_TAG", "GITHUB_REF", "GITHUB_REF_NAME"] as const;

function run(
  args: string[],
  env: Partial<Record<(typeof HOST_VARS)[number], string>>,
): { status: number | null; output: string } {
  const merged: NodeJS.ProcessEnv = { ...process.env };
  for (const name of HOST_VARS) merged[name] = env[name] ?? "";
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf-8",
    env: merged,
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("release-preflight tag detection", () => {
  it("accepts a GitLab tag pipeline (CI_COMMIT_TAG)", () => {
    const res = run(["check-versions", "--require-tag"], {
      CI_COMMIT_TAG: `v${VERSION}`,
    });
    expect(res.output).toContain(`git tag v${VERSION}`);
    expect(res.status).toBe(0);
  });

  it("accepts a GitHub tag push (GITHUB_REF)", () => {
    const res = run(["check-versions", "--require-tag"], {
      GITHUB_REF: `refs/tags/v${VERSION}`,
    });
    expect(res.output).toContain(`git tag v${VERSION}`);
    expect(res.status).toBe(0);
  });

  it("refuses a branch pipeline", () => {
    const res = run(["check-versions", "--require-tag"], {});
    expect(res.status).toBe(1);
    expect(res.output).toContain(`Expected a git tag like v${VERSION}`);
  });

  it("refuses a tag that disagrees with the package versions", () => {
    const res = run(["check-versions", "--require-tag"], {
      CI_COMMIT_TAG: "v9.9.9",
    });
    expect(res.status).toBe(1);
    expect(res.output).toContain("does not match package version");
  });
});
