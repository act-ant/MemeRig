/**
 * Consumer-visible rules routing through the existing sub-agent context path.
 *
 * The rules directory is declarative content: `.memerig/rules/index.md` lists
 * adopted declarations, and each applicable body reaches a sub-agent because
 * the task manifest references it. This test runs the real shared hook with a
 * realistic PreToolUse payload and verifies:
 *
 *   - curated rule bodies are injected,
 *   - a rule document that is present on disk but not curated is omitted.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEMPLATE_SCRIPTS = path.resolve(
  __dirname,
  "../../../templates/assets/memerig/scripts",
);
const HOOK_PATH = path.resolve(
  __dirname,
  "../../../templates/assets/shared-hooks/inject-subagent-context.py",
);
const PYTHON = process.platform === "win32" ? "python" : "python3";

function hasPython(): boolean {
  try {
    execFileSync(PYTHON, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function setupRepo(tmp: string): void {
  execFileSync("git", ["init", "--quiet"], { cwd: tmp, stdio: "ignore" });
  fs.mkdirSync(path.join(tmp, ".memerig", "scripts"), { recursive: true });
  fs.cpSync(TEMPLATE_SCRIPTS, path.join(tmp, ".memerig", "scripts"), {
    recursive: true,
  });

  const rulesDir = path.join(tmp, ".memerig", "rules");
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(
    path.join(rulesDir, "index.md"),
    [
      "# Project Rules",
      "",
      "| Rule | Applies to |",
      "| --- | --- |",
      "| [Core](./core.md) | All project work |",
      "| [Adopted](./adopted.md) | This repository |",
      "",
    ].join("\n"),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(rulesDir, "core.md"),
    "# Core Rules\n\nSENTINEL_CORE_RULE\n",
    "utf-8",
  );
  fs.writeFileSync(
    path.join(rulesDir, "adopted.md"),
    "# Adopted Rule\n\nSENTINEL_ADOPTED_RULE\n",
    "utf-8",
  );
  fs.writeFileSync(
    path.join(rulesDir, "unadopted.md"),
    "# Catalog Example\n\nSENTINEL_UNADOPTED_RULE\n",
    "utf-8",
  );

  const taskDir = path.join(tmp, ".memerig", "tasks", "rules-task");
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(
    path.join(taskDir, "task.json"),
    JSON.stringify({
      id: "rules-task",
      title: "rules task",
      status: "in_progress",
    }) + "\n",
    "utf-8",
  );
  fs.writeFileSync(
    path.join(taskDir, "prd.md"),
    "# Rules task\n\nSENTINEL_PRD\n",
    "utf-8",
  );

  // The hook resolves the task through the sole session file when the payload
  // has no native session identity. That is the class-2 child fallback path.
  const sessionsDir = path.join(tmp, ".memerig", ".runtime", "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, "rule-session.json"),
    JSON.stringify({ current_task: ".memerig/tasks/rules-task" }) + "\n",
    "utf-8",
  );
}

function writeManifest(tmp: string, entries: string[]): void {
  fs.writeFileSync(
    path.join(tmp, ".memerig", "tasks", "rules-task", "implement.jsonl"),
    entries.join("\n") + "\n",
    "utf-8",
  );
}

function runHook(tmp: string): string {
  const payload = {
    tool_name: "Task",
    cwd: tmp,
    tool_input: {
      subagent_type: "memerig-implement",
      prompt: "ORIGINAL IMPLEMENT TASK",
    },
  };
  const result = spawnSync(PYTHON, [HOOK_PATH], {
    cwd: tmp,
    encoding: "utf-8",
    input: JSON.stringify(payload),
  });
  if (result.error) throw result.error;
  expect(result.status).toBe(0);
  expect(result.stdout.trim(), result.stderr).not.toBe("");
  const output = JSON.parse(result.stdout) as {
    hookSpecificOutput?: { updatedInput?: { prompt?: string } };
    updatedInput?: { prompt?: string };
  };
  const prompt =
    output.hookSpecificOutput?.updatedInput?.prompt ??
    output.updatedInput?.prompt ??
    "";
  expect(prompt).toContain("<!-- memerig-hook-injected -->");
  return prompt;
}

describe.skipIf(!hasPython())(
  "rules context routing through the shared sub-agent hook",
  () => {
    let tmp: string;

    beforeEach(() => {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "memerig-rules-context-"));
      setupRepo(tmp);
    });

    afterEach(() => {
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it("injects curated rule bodies and omits an unadopted declaration", () => {
      writeManifest(tmp, [
        JSON.stringify({
          file: ".memerig/rules/index.md",
          reason: "Adopted rule index",
        }),
        JSON.stringify({
          file: ".memerig/rules/core.md",
          reason: "Baseline rules",
        }),
        JSON.stringify({
          file: ".memerig/rules/adopted.md",
          reason: "Project-specific rule",
        }),
      ]);

      const prompt = runHook(tmp);

      expect(prompt).toContain("SENTINEL_CORE_RULE");
      expect(prompt).toContain("SENTINEL_ADOPTED_RULE");
      expect(prompt).toContain("Rules task");
      expect(prompt).not.toContain("SENTINEL_UNADOPTED_RULE");
    });
  },
);
