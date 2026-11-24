/**
 * User-level Rules reach SessionStart context from the user's home directory.
 *
 * The canonical parser lives in session_context.py. This test isolates HOME /
 * USERPROFILE, copies the real template scripts into a temp project, and runs
 * the same entry points the CLI and hooks use. It verifies:
 *
 *   - `load: always` bodies are inlined without their frontmatter,
 *   - `load: index` / missing / unknown values are path-only entries,
 *   - non-Markdown files and nested directories are ignored,
 *   - output order is stable and JSON carries structured metadata.
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
const SHARED_HOOK = path.resolve(
  __dirname,
  "../../../templates/assets/shared-hooks/session-start.py",
);
const SUBAGENT_HOOK = path.resolve(
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

describe.skipIf(!hasPython())("user-level rules in SessionStart context", () => {
  let tmpProject: string;
  let tmpHome: string;
  let rulesDir: string;

  beforeEach(() => {
    tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "memerig-user-rules-"));
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "memerig-user-home-"));
    rulesDir = path.join(tmpHome, ".memerig", "rules");

    execFileSync("git", ["init", "--quiet"], {
      cwd: tmpProject,
      stdio: "ignore",
    });
    fs.mkdirSync(path.join(tmpProject, ".memerig", "scripts"), {
      recursive: true,
    });
    fs.cpSync(TEMPLATE_SCRIPTS, path.join(tmpProject, ".memerig", "scripts"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmpProject, ".memerig", ".developer"),
      "name=test-dev\n",
      "utf-8",
    );
    fs.mkdirSync(path.join(tmpProject, ".memerig", "tasks"), { recursive: true });
    fs.mkdirSync(
      path.join(tmpProject, ".memerig", "workspace", "test-dev"),
      { recursive: true },
    );
  });

  afterEach(() => {
    fs.rmSync(tmpProject, { recursive: true, force: true });
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function writeRule(file: string, content: string): void {
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, file), content, "utf-8");
  }

  function runContext(kind: "text" | "json"): string {
    const runnerPath = path.join(tmpProject, "run-context.py");
    const expression =
      kind === "text"
        ? "print(session_context.get_context_text(Path.cwd()))"
        : "print(json.dumps(session_context.get_context_json(Path.cwd())))";
    fs.writeFileSync(
      runnerPath,
      [
        "import json",
        "import sys",
        "from pathlib import Path",
        "sys.path.insert(0, str(Path.cwd() / '.memerig' / 'scripts'))",
        "from common import session_context",
        expression,
        "",
      ].join("\n"),
      "utf-8",
    );

    const result = spawnSync(PYTHON, [runnerPath], {
      cwd: tmpProject,
      encoding: "utf-8",
      env: {
        ...process.env,
        // Python's Path.home() uses HOME on POSIX and USERPROFILE on Windows.
        HOME: tmpHome,
        USERPROFILE: tmpHome,
      },
    });
    if (result.error) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    return result.stdout;
  }

  function runSessionStart(): string {
    const result = spawnSync(PYTHON, [SHARED_HOOK], {
      cwd: tmpProject,
      encoding: "utf-8",
      input: JSON.stringify({
        session_id: "user-rules-hook",
        cwd: tmpProject,
      }),
      env: {
        ...process.env,
        HOME: tmpHome,
        USERPROFILE: tmpHome,
        CLAUDE_PROJECT_DIR: tmpProject,
      },
    });
    if (result.error) throw result.error;
    expect(result.status, result.stderr).toBe(0);

    const parsed = JSON.parse(result.stdout) as {
      hookSpecificOutput?: { additionalContext?: string };
      additional_context?: string;
    };
    return (
      parsed.hookSpecificOutput?.additionalContext ??
      parsed.additional_context ??
      ""
    );
  }

  function runSubagentHook(): string {
    const taskDir = path.join(tmpProject, ".memerig", "tasks", "rules-task");
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

    const projectRules = path.join(tmpProject, ".memerig", "rules");
    fs.mkdirSync(projectRules, { recursive: true });
    fs.writeFileSync(
      path.join(projectRules, "index.md"),
      "# Project Rules\n\n- core.md\n",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(taskDir, "implement.jsonl"),
      JSON.stringify({
        file: ".memerig/rules/index.md",
        reason: "Project rule index",
      }) + "\n",
      "utf-8",
    );

    const sessionsDir = path.join(
      tmpProject,
      ".memerig",
      ".runtime",
      "sessions",
    );
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(
      path.join(sessionsDir, "user-rules-session.json"),
      JSON.stringify({ current_task: ".memerig/tasks/rules-task" }) + "\n",
      "utf-8",
    );

    const result = spawnSync(PYTHON, [SUBAGENT_HOOK], {
      cwd: tmpProject,
      encoding: "utf-8",
      input: JSON.stringify({
        tool_name: "Task",
        cwd: tmpProject,
        tool_input: {
          subagent_type: "memerig-implement",
          prompt: "ORIGINAL IMPLEMENT TASK",
        },
      }),
      env: {
        ...process.env,
        HOME: tmpHome,
        USERPROFILE: tmpHome,
      },
    });
    if (result.error) throw result.error;
    expect(result.status, result.stderr).toBe(0);

    const output = JSON.parse(result.stdout) as {
      hookSpecificOutput?: { updatedInput?: { prompt?: string } };
      updatedInput?: { prompt?: string };
    };
    return (
      output.hookSpecificOutput?.updatedInput?.prompt ??
      output.updatedInput?.prompt ??
      ""
    );
  }

  it("injects user-level rules into hook-built sub-agent prompts", () => {
    writeRule(
      "01-language.md",
      "---\nload: always\n---\n# Response language\nSENTINEL_SUBAGENT_ALWAYS\n",
    );
    writeRule(
      "02-monorepo.md",
      "# Monorepo specifics\nSENTINEL_SUBAGENT_INDEX\n",
    );

    const prompt = runSubagentHook();

    expect(prompt).toContain("<!-- memerig-hook-injected -->");
    expect(prompt).toContain("SENTINEL_SUBAGENT_ALWAYS");
    expect(prompt).toContain("~/.memerig/rules/*.md");
    expect(prompt).not.toContain("SENTINEL_SUBAGENT_INDEX");
  });

  it("injects user-level rules into the shared SessionStart payload", () => {
    writeRule(
      "01-language.md",
      "---\nload: always\n---\n# Response language\nSENTINEL_HOOK_ALWAYS\n",
    );
    writeRule(
      "02-monorepo.md",
      "# Monorepo specifics\nSENTINEL_HOOK_INDEX\n",
    );

    const context = runSessionStart();

    expect(context).toContain("## USER RULES");
    expect(context).toContain("SENTINEL_HOOK_ALWAYS");
    expect(context).not.toContain("SENTINEL_HOOK_INDEX");
  });

  it("inlines always rules and indexes the rest in stable order", () => {
    writeRule(
      "01-language.md",
      "---\nload: always\n---\n# Response language\nSENTINEL_ALWAYS_RULE\n",
    );
    writeRule("02-monorepo.md", "# Monorepo specifics\nSENTINEL_INDEX_RULE\n");
    writeRule(
      "03-unknown.md",
      "---\nload: someday\n---\n# Unknown mode\nSENTINEL_UNKNOWN_RULE\n",
    );
    writeRule("notes.txt", "SENTINEL_NON_MD\n");
    fs.mkdirSync(path.join(rulesDir, "nested"));
    fs.writeFileSync(
      path.join(rulesDir, "nested", "04.md"),
      "SENTINEL_NESTED_RULE\n",
      "utf-8",
    );

    const text = runContext("text");

    expect(text).toContain("## USER RULES");
    expect(text).toContain(`Source: ${rulesDir}`);
    expect(text).toContain(
      "### 01-language.md — Response language  [load: always]",
    );
    expect(text).toContain("SENTINEL_ALWAYS_RULE");
    expect(text).not.toContain("---\nload: always");
    expect(text).toContain(
      "### 02-monorepo.md — Monorepo specifics  [load: index]",
    );
    expect(text).toContain(`Path: ${path.join(rulesDir, "02-monorepo.md")}`);
    expect(text).not.toContain("SENTINEL_INDEX_RULE");
    expect(text).toContain("### 03-unknown.md — Unknown mode  [load: index]");
    expect(text).not.toContain("SENTINEL_UNKNOWN_RULE");
    expect(text).not.toContain("SENTINEL_NON_MD");
    expect(text).not.toContain("SENTINEL_NESTED_RULE");

    const first = text.indexOf("01-language.md");
    const second = text.indexOf("02-monorepo.md");
    const third = text.indexOf("03-unknown.md");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });

  it("carries structured metadata in JSON", () => {
    writeRule(
      "01-language.md",
      "---\nload: always\n---\n# Response language\nSENTINEL_ALWAYS_RULE\n",
    );
    writeRule("02-monorepo.md", "# Monorepo specifics\nSENTINEL_INDEX_RULE\n");
    writeRule(
      "03-unknown.md",
      "---\nload: someday\n---\n# Unknown mode\nSENTINEL_UNKNOWN_RULE\n",
    );

    const context = JSON.parse(runContext("json")) as {
      userRules?: {
        directory: string;
        rules: {
          file: string;
          title: string;
          load: string;
          content?: string;
        }[];
      };
    };

    expect(context.userRules?.directory).toBe(rulesDir);
    expect(context.userRules?.rules.map((rule) => [rule.file, rule.load])).toEqual([
      ["01-language.md", "always"],
      ["02-monorepo.md", "index"],
      ["03-unknown.md", "index"],
    ]);
    expect(context.userRules?.rules[0].content).toContain(
      "SENTINEL_ALWAYS_RULE",
    );
    expect(context.userRules?.rules[1].content).toBeUndefined();
  });

  it("omits the section when no user rules exist", () => {
    const text = runContext("text");
    expect(text).not.toContain("## USER RULES");

    const context = JSON.parse(runContext("json")) as {
      userRules?: unknown;
    };
    expect(context.userRules).toBeUndefined();
  });

  it("treats a malformed frontmatter fence as an index rule", () => {
    writeRule(
      "broken.md",
      "---\nload: always\n# Missing closing fence\nSENTINEL_BROKEN_RULE\n",
    );

    const text = runContext("text");

    expect(text).toContain(
      "### broken.md — Missing closing fence  [load: index]",
    );
    expect(text).toContain(`Path: ${path.join(rulesDir, "broken.md")}`);
    expect(text).not.toContain("SENTINEL_BROKEN_RULE");
  });
});
