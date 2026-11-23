/**
 * Integration tests for the init() command.
 *
 * Tests the full init flow in real temp directories with minimal mocking.
 * Only external dependencies are mocked: figlet, inquirer, child_process.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// === External dependency mocks (hoisted by vitest) ===

vi.mock("figlet", () => ({
  default: { textSync: vi.fn(() => "MEMERIG") },
}));

vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({}) },
}));

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof ChildProcess>()),
  execSync: vi.fn().mockReturnValue(""),
}));

const registryDownload = vi.hoisted(() => ({
  files: new Map<string, string>(),
  failure: undefined as Error | undefined,
}));

vi.mock("giget", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  return {
    downloadTemplate: vi.fn(
      async (_source: string, options: { dir: string }) => {
        for (const [relativePath, content] of registryDownload.files) {
          const targetPath = path.join(options.dir, relativePath);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, content, "utf-8");
        }
        if (registryDownload.failure) throw registryDownload.failure;
      },
    ),
  };
});

// === Imports ===

import { init } from "../../src/commands/init.js";
import inquirer from "inquirer";
import { VERSION } from "../../src/constants/version.js";
import { DIR_NAMES, FILE_NAMES, PATHS } from "../../src/constants/paths.js";
import { collectPlatformTemplates } from "../../src/configurators/index.js";
import { computeHash } from "../../src/utils/template-hash.js";
import {
  COPILOT_INSTRUCTIONS_PATH,
  getCopilotInstructions,
} from "../../src/templates/copilot/index.js";
import { execSync } from "node:child_process";
import type * as ChildProcess from "node:child_process";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

describe("init() integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "memerig-init-int-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    registryDownload.files.clear();
    registryDownload.failure = undefined;
    vi.mocked(execSync).mockClear();
    vi.mocked(execSync).mockImplementation(((cmd: string) => {
      const expectedPythonCmd =
        process.platform === "win32" ? "python" : "python3";
      if (cmd === `${expectedPythonCmd} --version`) {
        return "Python 3.11.12";
      }
      return "";
    }) as typeof execSync);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("initializes the AGENTS.md open protocol when no platform is selected", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("Network disabled"));
    vi.stubGlobal("fetch", fetch);
    await init({});
    const memerig = path.join(tmpDir, DIR_NAMES.WORKFLOW);
    expect(fs.existsSync(path.join(tmpDir, PATHS.SCRIPTS, "task.py"))).toBe(true);
    // Open protocol still gets the full workflow structure: spec scaffolds,
    // workspace, channel runtime agents, and the journal merge rule.
    expect(fs.existsSync(path.join(tmpDir, PATHS.SPEC))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, PATHS.WORKSPACE))).toBe(true);
    expect(fs.existsSync(path.join(memerig, "agents"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".gitattributes"))).toBe(true);
    expect(fs.readdirSync(path.join(tmpDir, PATHS.TASKS))).toEqual([]);
    // No platform directories, and no prompts (stdin is not a TTY here).
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, "AGENTS.md"))).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf-8")).toContain(
      ".memerig/workflow.md",
    );
    expect(
      vi
        .mocked(console.log)
        .mock.calls.flat()
        .some(
          (part) =>
            typeof part === "string" &&
            part.includes("AGENTS.md open protocol"),
        ),
    ).toBe(true);
    expect(fs.readFileSync(path.join(memerig, "config.yaml"), "utf-8")).toMatch(/^ {2}version_control: local$/m);
    expect(fs.readFileSync(path.join(memerig, ".gitignore"), "utf-8")).toMatch(/^\/tasks\/$/m);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("configures the interactively selected platform and bundled preset", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network disabled")),
    );
    const originalIsTTY = Object.getOwnPropertyDescriptor(
      process.stdin,
      "isTTY",
    );
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    try {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ tools: ["claude"] })
        .mockResolvedValueOnce({ withStatusline: false })
        .mockResolvedValueOnce({ template: "trellis" });

      await init({});

      expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, PATHS.SPEC, "index.md"))).toBe(
        true,
      );
    } finally {
      if (originalIsTTY) {
        Object.defineProperty(process.stdin, "isTTY", originalIsTTY);
      } else {
        Reflect.deleteProperty(process.stdin, "isTTY");
      }
    }
  });

  it("leaves a fresh checkout untouched when an explicit template is unknown", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ templates: [] })));

    await expect(init({ yes: true, template: "learn-harnes" })).rejects.toThrow(
      'Template "learn-harnes" not found',
    );
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it("leaves a fresh checkout untouched when a spec download fails after extraction starts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    registryDownload.files.set("index.md", "# Partial extraction\n");
    registryDownload.failure = new Error("extraction interrupted");

    await expect(init({ yes: true, registry: "bitbucket:myorg/registry/spec" })).rejects.toThrow(
      "extraction interrupted",
    );
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it("#1a writes .gitattributes with the journal merge=union rule (#415)", async () => {
    await init({ yes: true, claude: true });

    const gitattributes = fs.readFileSync(
      path.join(tmpDir, ".gitattributes"),
      "utf-8",
    );
    expect(gitattributes).toContain(
      ".memerig/workspace/*/journal-*.md merge=union",
    );
    expect(gitattributes).not.toContain("index.md merge=union");
  });

  it("#1b does not print the promotional pain-point block", async () => {
    await init({ yes: true });

    const logOutput = vi
      .mocked(console.log)
      .mock.calls.flat()
      .filter((part): part is string => typeof part === "string")
      .join("\n");

    expect(logOutput).not.toContain("Sound familiar?");
    expect(logOutput).not.toContain("You'll never say these again!!");
    expect(logOutput).not.toContain("Wrote CLAUDE.md, AI ignored it");
  });

  it("#2 single platform creates only that platform directory", async () => {
    await init({ yes: true, claude: true });

    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".opencode"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".codex"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".agents", "skills"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".agent", "workflows"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".kiro", "skills"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".gemini"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".qoder"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".codebuddy"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".devin", "workflows"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".github", "copilot"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".factory"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".pi"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".kimi-code"))).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".claude", "skills", "meta", "SKILL.md"),
      ),
    ).toBe(true);
  });

  it("#3 multi platform creates all selected platform directories", async () => {
    await init({ yes: true, claude: true, cursor: true, opencode: true });

    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".opencode"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".codex"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".agents", "skills"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".agent", "workflows"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".kiro", "skills"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".gemini"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".qoder"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".codebuddy"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".devin", "workflows"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".github", "copilot"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".pi"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".kimi-code"))).toBe(false);
  });

  it("#3b codex platform creates skills plus .codex assets", async () => {
    await init({ yes: true, codex: true });

    expect(fs.existsSync(path.join(tmpDir, ".agents", "skills"))).toBe(true);
    // Codex SessionStart hook was removed (de-recursion fix); the
    // <memerig-bootstrap> notice in inject-workflow-state.py invokes
    // `$start` to load workflow context, so the skill is emitted.
    expect(
      fs.existsSync(
        path.join(tmpDir, ".agents", "skills", "start", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          ".agents",
          "skills",
          "finish-work",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".agents", "skills", "continue", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".agents", "skills", "meta", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          ".agents",
          "skills",
          "meta",
          "references",
          "local-architecture",
          "overview.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".codex", "skills", "meta", "SKILL.md"),
      ),
    ).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".codex", "config.toml"))).toBe(
      true,
    );
    expect(
      fs.existsSync(
        path.join(tmpDir, ".codex", "agents", "memerig-check.toml"),
      ),
    ).toBe(true);
    // parallel skill removed — platform-native worktree features used instead
    expect(fs.existsSync(path.join(tmpDir, ".codex", "hooks.json"))).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".codex", "hooks", "session-start.py")),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".gemini"))).toBe(false);

    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashesFile = JSON.parse(fs.readFileSync(hashFile, "utf-8")) as {
      __version?: number;
      hashes?: Record<string, string>;
    };
    const hashes = hashesFile.hashes ?? {};
    const trackedPaths = Object.keys(hashes).map((p) => p.replace(/\\/g, "/"));
    expect(trackedPaths).toContain(".agents/skills/meta/SKILL.md");
    expect(trackedPaths).toContain(
      ".agents/skills/meta/references/local-architecture/overview.md",
    );
    expect(trackedPaths).toContain(
      ".agents/skills/spec-bootstrap/SKILL.md",
    );
    expect(trackedPaths).toContain(
      ".agents/skills/spec-bootstrap/references/spec-writing.md",
    );
  });

  it("#3c kiro platform creates .kiro/skills", async () => {
    await init({ yes: true, kiro: true });

    expect(fs.existsSync(path.join(tmpDir, ".kiro", "skills"))).toBe(true);
    // Kiro is agent-capable → start skill not emitted.
    expect(
      fs.existsSync(
        path.join(tmpDir, ".kiro", "skills", "start", "SKILL.md"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".kiro", "skills", "finish-work", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".kiro", "skills", "continue", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".kiro", "skills", "check", "SKILL.md"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
  });

  it("#3d antigravity platform creates .agent/workflows", async () => {
    await init({ yes: true, antigravity: true });

    expect(fs.existsSync(path.join(tmpDir, ".agent", "workflows"))).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".agent", "workflows", "start.md")),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".gemini"))).toBe(false);
  });

  it("#3f devin platform creates .devin/workflows", async () => {
    await init({ yes: true, devin: true });

    expect(fs.existsSync(path.join(tmpDir, ".devin", "workflows"))).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".devin", "workflows", "memerig-start.md"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
  });

  it("#3f-alias deprecated --windsurf still configures Devin (.devin/workflows)", async () => {
    // Windsurf was renamed to Devin; --windsurf remains a deprecated alias.
    await init({ yes: true, windsurf: true });

    expect(fs.existsSync(path.join(tmpDir, ".devin", "workflows"))).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".devin", "workflows", "memerig-start.md"),
      ),
    ).toBe(true);
    // Should NOT write the old .windsurf/ directory.
    expect(fs.existsSync(path.join(tmpDir, ".windsurf", "workflows"))).toBe(
      false,
    );
  });

  it("#3g qoder platform creates .qoder/commands + .qoder/skills", async () => {
    await init({ yes: true, qoder: true });

    expect(
      fs.existsSync(
        path.join(tmpDir, ".qoder", "commands", "memerig-finish-work.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".qoder", "skills", "brainstorm", "SKILL.md"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
  });

  it("#3h codebuddy platform creates .codebuddy/commands/memerig", async () => {
    await init({ yes: true, codebuddy: true });

    expect(
      fs.existsSync(path.join(tmpDir, ".codebuddy", "commands", "memerig")),
    ).toBe(true);
    // CodeBuddy is agent-capable → start.md not emitted.
    expect(
      fs.existsSync(
        path.join(tmpDir, ".codebuddy", "commands", "memerig", "start.md"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          ".codebuddy",
          "commands",
          "memerig",
          "finish-work.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".codebuddy", "commands", "memerig", "continue.md"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
  });

  it("#3i copilot platform creates .github/copilot hooks and discovery config", async () => {
    await init({ yes: true, copilot: true });

    expect(fs.existsSync(path.join(tmpDir, ".github", "prompts"))).toBe(true);
    // Copilot is agent-capable → start.prompt.md not emitted.
    expect(
      fs.existsSync(path.join(tmpDir, ".github", "prompts", "start.prompt.md")),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".github", "prompts", "finish-work.prompt.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".github", "prompts", "continue.prompt.md"),
      ),
    ).toBe(true);

    expect(
      fs.existsSync(path.join(tmpDir, ".github", "copilot", "hooks")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".github", "copilot", "hooks", "session-start.py"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".github", "copilot", "hooks.json")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".github", "hooks", "memerig.json")),
    ).toBe(true);
    const copilotInstructionsPath = path.join(
      tmpDir,
      ...COPILOT_INSTRUCTIONS_PATH.split("/"),
    );
    expect(fs.existsSync(copilotInstructionsPath)).toBe(true);
    expect(fs.readFileSync(copilotInstructionsPath, "utf-8")).toBe(
      getCopilotInstructions(),
    );

    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashesFile = JSON.parse(fs.readFileSync(hashFile, "utf-8")) as {
      __version?: number;
      hashes?: Record<string, string>;
    };
    const hashes = hashesFile.hashes ?? {};
    const trackedPaths = Object.keys(hashes).map((p) => p.replace(/\\/g, "/"));
    expect(trackedPaths).not.toContain(".github/prompts/start.prompt.md");
    expect(trackedPaths).toContain(".github/prompts/finish-work.prompt.md");
    expect(trackedPaths).toContain(".github/prompts/continue.prompt.md");
    expect(trackedPaths).toContain(COPILOT_INSTRUCTIONS_PATH);
    expect(trackedPaths).toContain(".github/copilot/hooks.json");
    expect(trackedPaths).toContain(".github/hooks/memerig.json");

    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
  });

  it("#3e gemini platform creates .gemini/commands/memerig", async () => {
    await init({ yes: true, gemini: true });
    expect(
      fs.existsSync(path.join(tmpDir, ".gemini", "commands", "memerig")),
    ).toBe(true);
    // Gemini is agent-capable → start.toml not emitted.
    expect(
      fs.existsSync(
        path.join(tmpDir, ".gemini", "commands", "memerig", "start.toml"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".gemini", "commands", "memerig", "finish-work.toml"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".gemini", "commands", "memerig", "continue.toml"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
  });

  it("#3j droid platform creates commands + skills", async () => {
    await init({ yes: true, droid: true });
    // Droid is agent-capable → start.md not emitted.
    expect(
      fs.existsSync(
        path.join(tmpDir, ".factory", "commands", "memerig", "start.md"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".factory", "commands", "memerig", "finish-work.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".factory", "commands", "memerig", "continue.md"),
      ),
    ).toBe(true);
    // Skills (memerig- prefix)
    expect(
      fs.existsSync(
        path.join(tmpDir, ".factory", "skills", "check", "SKILL.md"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);
  });

  it("#3k pi platform creates extension-backed prompts, skills, and agents", async () => {
    await init({ yes: true, pi: true });

    expect(fs.existsSync(path.join(tmpDir, ".pi", "settings.json"))).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".pi", "prompts", "memerig-start.md")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".pi", "prompts", "memerig-finish-work.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".pi", "prompts", "memerig-continue.md")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".agents", "skills", "check", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".pi", "agents", "memerig-implement.md")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".pi", "extensions", "memerig", "index.ts"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".pi", "hooks"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);

    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashesFile = JSON.parse(fs.readFileSync(hashFile, "utf-8")) as {
      __version?: number;
      hashes?: Record<string, string>;
    };
    const hashes = hashesFile.hashes ?? {};
    const trackedPaths = Object.keys(hashes).map((p) => p.replace(/\\/g, "/"));
    const piTemplates = collectPlatformTemplates("pi");
    expect(piTemplates).toBeInstanceOf(Map);
    if (!piTemplates) {
      throw new Error("Expected Pi templates to be collectable");
    }
    const expectedPiPaths = [...piTemplates.keys()];
    expect(trackedPaths).toEqual(expect.arrayContaining(expectedPiPaths));
  });

  it("#3m kimi platform creates shared skills and .kimi-code skills", async () => {
    await init({ yes: true, kimi: true });

    // Shared workflow + bundled skills → .agents/skills/
    expect(
      fs.existsSync(
        path.join(tmpDir, ".agents", "skills", "check", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".agents", "skills", "meta", "SKILL.md"),
      ),
    ).toBe(true);

    // Kimi-private skills: commands-as-skills + agent prompts
    expect(
      fs.existsSync(
        path.join(tmpDir, ".kimi-code", "skills", "start", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          ".kimi-code",
          "skills",
          "continue",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          ".kimi-code",
          "skills",
          "finish-work",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          ".kimi-code",
          "skills",
          "memerig-implement",
          "SKILL.md",
        ),
      ),
    ).toBe(true);

    // Custom sub-agent definitions → .kimi-code/agents/
    for (const name of [
      "memerig-implement",
      "memerig-check",
      "memerig-research",
    ]) {
      expect(
        fs.existsSync(path.join(tmpDir, ".kimi-code", "agents", `${name}.md`)),
      ).toBe(true);
    }

    // Kimi has no project-level hooks/settings surface.
    expect(fs.existsSync(path.join(tmpDir, ".kimi-code", "hooks"))).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, ".kimi-code", "settings.json")),
    ).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor"))).toBe(false);

    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashesFile = JSON.parse(fs.readFileSync(hashFile, "utf-8")) as {
      __version?: number;
      hashes?: Record<string, string>;
    };
    const hashes = hashesFile.hashes ?? {};
    const trackedPaths = Object.keys(hashes).map((p) => p.replace(/\\/g, "/"));
    const kimiTemplates = collectPlatformTemplates("kimi");
    expect(kimiTemplates).toBeInstanceOf(Map);
    if (!kimiTemplates) {
      throw new Error("Expected Kimi templates to be collectable");
    }
    const expectedKimiPaths = [...kimiTemplates.keys()];
    expect(trackedPaths).toEqual(expect.arrayContaining(expectedKimiPaths));
  });

  it("#3l trae platform writes hooks, commands, agents, and tracked templates", async () => {
    await init({ yes: true, trae: true });

    // Trae is agentCapable && hasHooks, so start is filtered like other
    // SessionStart-backed platforms. The generated agents are still pull-based
    // for sub-agent task context because Trae hooks cannot mutate sub-agent prompts.
    expect(fs.existsSync(path.join(tmpDir, ".trae", "hooks.json"))).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".trae", "hooks", "session-start.py")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".trae", "hooks", "inject-workflow-state.py"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".trae", "commands", "memerig-finish-work.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".trae", "commands", "memerig-start.md")),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".trae", "agents", "memerig-implement.md"),
      ),
    ).toBe(true);
    expect(
      fs.readFileSync(
        path.join(tmpDir, ".trae", "agents", "memerig-implement.md"),
        "utf-8",
      ),
    ).toContain("Load MemeRig Context First");

    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashesFile = JSON.parse(fs.readFileSync(hashFile, "utf-8")) as {
      hashes?: Record<string, string>;
    };
    const trackedPaths = Object.keys(hashesFile.hashes ?? {}).map((p) =>
      p.replace(/\\/g, "/"),
    );
    const traeTemplates = collectPlatformTemplates("trae");
    expect(traeTemplates).toBeInstanceOf(Map);
    if (!traeTemplates) {
      throw new Error("Expected Trae templates to be collectable");
    }
    expect(trackedPaths).toEqual(
      expect.arrayContaining([...traeTemplates.keys()]),
    );
  });

  it("#3m zcode platform filters start command and writes hooks (hasHooks=true)", async () => {
    await init({ yes: true, zcode: true });

    // ZCode owns its private .zcode surface. Commands remain commands, while
    // .zcode/skills contains workflow/bundled skills only. Since ZCode is
    // agentCapable && hasHooks, the start command is filtered out (SessionStart
    // hook injects equivalent context) and hook assets are written.
    expect(fs.existsSync(path.join(tmpDir, ".agents", "skills"))).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".agents", "skills", "start", "SKILL.md"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".zcode", "commands", "memerig", "start.md"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".zcode", "skills", "start", "SKILL.md"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".zcode", "skills", "continue", "SKILL.md"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          ".zcode",
          "skills",
          "finish-work",
          "SKILL.md",
        ),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".zcode", "skills", "check", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".zcode", "agents", "memerig-implement.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".zcode", "agents", "memerig-check.md")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".zcode", "agents", "memerig-research.md"),
      ),
    ).toBe(true);
  });

  it("[issue-zcode-plugin-hint] zcode init prints a concise bilingual plugin hint", async () => {
    const originalVitest = process.env.VITEST;
    const originalQuiet = process.env.MEMERIG_QUIET;
    const originalWrite = process.stderr.write.bind(process.stderr);
    const stderr: string[] = [];
    process.stderr.write = ((chunk: string) => {
      stderr.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    delete process.env.VITEST;
    delete process.env.MEMERIG_QUIET;

    try {
      await init({ yes: true, zcode: true });
    } finally {
      process.stderr.write = originalWrite;
      if (originalVitest === undefined) delete process.env.VITEST;
      else process.env.VITEST = originalVitest;
      if (originalQuiet === undefined) delete process.env.MEMERIG_QUIET;
      else process.env.MEMERIG_QUIET = originalQuiet;
    }

    expect(stderr.join("")).toBe(
      "ℹ️  ZCode: if project Hooks are disabled, install memerig-bridge, then start a new session.\n" +
        "   ZCode：若项目 Hooks 被禁用，请安装 memerig-bridge，然后新建会话。\n" +
        "   请手动在 ZCode 插件市场中添加 https://github.com/CNHLAIA/ZCode-MemeRig-Plugin.git，并手动安装 ZCode 补丁插件 memerig-bridge\n",
    );
  });

  it("#3n opencode platform emits start slash command", async () => {
    await init({ yes: true, opencode: true });

    // OpenCode is agentCapable && !hasHooks per registry (plugins/session-start.js
    // provides equivalent injection, but the user-invocable /memerig:start is
    // still emitted as fallback for plugin failures / manual reload).
    expect(
      fs.existsSync(
        path.join(tmpDir, ".opencode", "commands", "memerig", "start.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, ".opencode", "commands", "memerig", "finish-work.md"),
      ),
    ).toBe(true);
  });

  it("#3o reasonix platform emits start skill without runAs:subagent", async () => {
    await init({ yes: true, reasonix: true });

    // Reasonix is agentCapable && !hasHooks → start ships as a plain
    // user-invocable skill. It must NOT carry the `runAs: subagent` frontmatter
    // — that field is reserved for memerig-implement / memerig-check which run
    // as isolated subagent loops.
    const startSkill = path.join(
      tmpDir,
      ".reasonix",
      "skills",
      "start",
      "SKILL.md",
    );
    expect(fs.existsSync(startSkill)).toBe(true);
    expect(fs.readFileSync(startSkill, "utf-8")).not.toContain(
      "runAs: subagent",
    );
  });

  it("#4 force mode overwrites previously modified files", async () => {
    await init({ yes: true, force: true });

    const workflowMd = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    const original = fs.readFileSync(workflowMd, "utf-8");
    fs.writeFileSync(workflowMd, "user modified content");

    await init({ yes: true, force: true });

    expect(fs.readFileSync(workflowMd, "utf-8")).toBe(original);
  });

  it("#5 skip mode preserves previously modified files", async () => {
    await init({ yes: true, force: true });

    const workflowMd = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    fs.writeFileSync(workflowMd, "user modified content");

    await init({ yes: true, skipExisting: true });

    expect(fs.readFileSync(workflowMd, "utf-8")).toBe("user modified content");
  });

  it("#6 re-init with force produces identical file set", async () => {
    await init({ yes: true, force: true });

    const collectFiles = (dir: string): string[] => {
      const files: string[] = [];
      const walk = (d: string) => {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, entry.name);
          if (entry.isDirectory()) walk(full);
          else files.push(path.relative(tmpDir, full));
        }
      };
      walk(dir);
      return files.sort();
    };

    const first = collectFiles(tmpDir);
    await init({ yes: true, force: true });
    const second = collectFiles(tmpDir);

    expect(second).toEqual(first);
  });

  it("sets an explicit developer without generating onboarding", async () => {
    vi.stubEnv("MEMERIG_DEVELOPER", undefined);
    await init({ yes: true, user: "testdev" });
    // The test uses the real Python subprocess, whose identity may otherwise come from the host.
    expect(fs.readFileSync(path.join(tmpDir, PATHS.DEVELOPER_FILE), "utf-8")).toContain("name=testdev");
    expect(fs.readdirSync(path.join(tmpDir, PATHS.TASKS))).toEqual([]);
  });

  it("#7b throws when the selected Python command is below 3.9", async () => {
    // v0.5.7: init now tries a fallback chain (#236). Mock every candidate to
    // return the same too-old version so all candidates fail uniformly.
    vi.mocked(execSync).mockImplementation(
      (() => "Python 3.8.18") as typeof execSync,
    );

    await expect(init({ yes: true, claude: true })).rejects.toThrow(
      /No supported Python command found.*Python 3\.8\.18 \(< 3\.9\)/s,
    );
    expect(fs.existsSync(path.join(tmpDir, DIR_NAMES.WORKFLOW))).toBe(false);
  });

  it("#7c throws when the selected Python command is missing", async () => {
    // v0.5.7: init now tries a fallback chain (#236). Mock every candidate to
    // throw "not found" so all candidates fail.
    vi.mocked(execSync).mockImplementation((() => {
      throw new Error("not found");
    }) as typeof execSync);

    await expect(init({ yes: true, claude: true })).rejects.toThrow(
      /No supported Python command found.*not found/s,
    );
    expect(fs.existsSync(path.join(tmpDir, DIR_NAMES.WORKFLOW))).toBe(false);
  });

  it("#7d renders the platform Python command into generated config and logs the adaptation", async () => {
    const expectedPythonCmd =
      process.platform === "win32" ? "python" : "python3";

    await init({ yes: true, claude: true });

    const settings = fs.readFileSync(
      path.join(tmpDir, ".claude", "settings.json"),
      "utf-8",
    );
    expect(settings).toContain(
      `"${expectedPythonCmd} .claude/hooks/session-start.py"`,
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(
        `MemeRig rendered Python commands as "${expectedPythonCmd}" in generated hooks, settings, and help text`,
      ),
    );
  });

  it("#8 writes correct version file", async () => {
    await init({ yes: true });

    const content = fs.readFileSync(
      path.join(tmpDir, DIR_NAMES.WORKFLOW, ".version"),
      "utf-8",
    );
    expect(content).toBe(VERSION);
  });

  it("#9 initializes template hash tracking file", async () => {
    await init({ yes: true });

    const hashPath = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    expect(fs.existsSync(hashPath)).toBe(true);
    const hashesFile = JSON.parse(fs.readFileSync(hashPath, "utf-8")) as {
      hashes?: Record<string, string>;
    };
    const hashes = hashesFile.hashes ?? {};
    const agentsContent = fs.readFileSync(
      path.join(tmpDir, FILE_NAMES.AGENTS),
      "utf-8",
    );
    expect(hashes[FILE_NAMES.AGENTS]).toBe(computeHash(agentsContent));
    expect(Object.keys(hashes).length).toBeGreaterThan(0);
  });

  it.each(["learn-harness", "trellis", "game-dev"])("installs %s from local preset bytes", async (template) => {
    const fetch = vi.fn().mockRejectedValue(new Error("Network disabled"));
    vi.stubGlobal("fetch", fetch);
    await init({ template });
    const installed = fs.readFileSync(path.join(tmpDir, PATHS.SPEC, "index.md"), "utf-8");
    const expected = fs.readFileSync(new URL(`../../../../marketplace/specs/${template}/index.md`, import.meta.url), "utf-8");
    expect(installed).toBe(expected);
    expect(fetch).not.toHaveBeenCalled();
    fs.writeFileSync(path.join(tmpDir, PATHS.SPEC, "index.md"), "Project rules\n");
    await init({ template, overwrite: true });
    expect(fs.readFileSync(path.join(tmpDir, PATHS.SPEC, "index.md"), "utf-8")).toBe("Project rules\n");
    expect(fs.readFileSync(path.join(tmpDir, PATHS.SPEC, "index.md.new"), "utf-8")).toBe(expected);
  });

  // ===========================================================================
  // Monorepo integration tests
  // ===========================================================================

  /** Helper: set up a pnpm workspace with two packages */
  function setupPnpmWorkspace(
    dir: string,
    packages: { rel: string; name: string; files?: Record<string, string> }[],
  ): void {
    fs.writeFileSync(
      path.join(dir, "pnpm-workspace.yaml"),
      "packages:\n  - 'packages/*'\n",
    );
    for (const pkg of packages) {
      const pkgDir = path.join(dir, pkg.rel);
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, "package.json"),
        JSON.stringify({ name: pkg.name }),
      );
      if (pkg.files) {
        for (const [name, content] of Object.entries(pkg.files)) {
          fs.writeFileSync(path.join(pkgDir, name), content);
        }
      }
    }
  }

  it("keeps a workspace spec blank unless a preset is selected", async () => {
    setupPnpmWorkspace(tmpDir, [{ rel: "packages/core", name: "core" }]);
    await init({ yes: true, monorepo: true });
    expect(fs.existsSync(path.join(tmpDir, PATHS.SPEC))).toBe(false);
  });

  it("#14 monorepo: writes packages section to config.yaml", async () => {
    setupPnpmWorkspace(tmpDir, [
      { rel: "packages/cli", name: "@memerig/cli" },
      { rel: "packages/docs", name: "@memerig/docs" },
    ]);

    await init({ yes: true, monorepo: true });

    const configPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml");
    expect(fs.existsSync(configPath)).toBe(true);

    const configContent = fs.readFileSync(configPath, "utf-8");
    expect(configContent).toContain("packages:");
    expect(configContent).toContain("cli:");
    expect(configContent).toContain("path: packages/cli");
    expect(configContent).toContain("docs:");
    expect(configContent).toContain("path: packages/docs");
    expect(configContent).toContain("default_package:");
  });

  it("#15 monorepo: bootstrap task references per-package spec paths", async () => {
    setupPnpmWorkspace(tmpDir, [
      { rel: "packages/core", name: "core" },
      { rel: "packages/ui", name: "ui" },
    ]);

    await init({ yes: true, user: "dev", withOnboarding: true, monorepo: true });

    const taskDir = path.join(tmpDir, PATHS.TASKS, "00-bootstrap-guidelines");
    expect(fs.existsSync(taskDir)).toBe(true);

    const taskJson = JSON.parse(
      fs.readFileSync(path.join(taskDir, "task.json"), "utf-8"),
    );

    // task.json.subtasks is canonical string[] (child task dir names);
    // per-package checklist items now live in prd.md as markdown checkboxes.
    expect(Array.isArray(taskJson.subtasks)).toBe(true);
    expect(taskJson.subtasks).toEqual([]);

    // Canonical shape: legacy current_phase / next_action must NOT appear
    expect(taskJson.current_phase).toBeUndefined();
    expect(taskJson.next_action).toBeUndefined();

    // The spec starts empty: relatedFiles point at the layout README, not at
    // per-package directories that no longer get scaffolded.
    expect(taskJson.relatedFiles).toEqual([".memerig/spec/README.md"]);

    // ...and no per-package spec directory is created for a blank init.
    expect(fs.existsSync(path.join(tmpDir, ".memerig/spec/core"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".memerig/spec/ui"))).toBe(false);

    // prd.md keeps the monorepo context but describes the empty spec instead
    // of per-package "Fill guidelines for <pkg>" placeholders.
    const prd = fs.readFileSync(path.join(taskDir, "prd.md"), "utf-8");
    const expectedPythonCmd =
      process.platform === "win32" ? "python" : "python3";
    expect(prd).toContain("core");
    expect(prd).toContain("ui");
    expect(prd).toContain("spec/");
    expect(prd).not.toContain("Fill guidelines for core");
    expect(prd).toContain(".memerig/spec/README.md");
    expect(prd).toContain(
      `${expectedPythonCmd} ./.memerig/scripts/task.py complete 00-bootstrap-guidelines`,
    );
  });

  it("#16 --no-monorepo skips detection even with workspace config", async () => {
    setupPnpmWorkspace(tmpDir, [{ rel: "packages/a", name: "a" }]);

    await init({ yes: true, monorepo: false });

    // config.yaml should NOT have packages: section
    const configContent = fs.readFileSync(
      path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml"),
      "utf-8",
    );
    expect(configContent).not.toMatch(/^packages\s*:/m);
  });

  it("#17 --monorepo without workspace config exits with error", async () => {
    // Empty directory — no workspace configs
    const logSpy = vi.mocked(console.log);

    await init({ yes: true, monorepo: true });

    // Should log error about missing multi-package layout
    const errorCall = logSpy.mock.calls.find(
      ([msg]) =>
        typeof msg === "string" &&
        msg.includes("no multi-package layout detected"),
    );
    expect(errorCall).toBeDefined();

    // Should also print the manual config.yaml example as guidance
    const guideCall = logSpy.mock.calls.find(
      ([msg]) => typeof msg === "string" && msg.includes("git: true"),
    );
    expect(guideCall).toBeDefined();

    // Should NOT create .memerig/ (early return)
    expect(fs.existsSync(path.join(tmpDir, DIR_NAMES.WORKFLOW))).toBe(false);
  });

  it("#20 -y --registry aborts on probe failure instead of direct download fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(init({
      yes: true,
      registry: "bitbucket:myorg/registry/spec",
    })).rejects.toThrow("Could not reach registry index");
    expect(fs.existsSync(path.join(tmpDir, DIR_NAMES.WORKFLOW))).toBe(false);
  });

  it("#21 -y --registry records direct spec registry source and tracks downloaded spec files", async () => {
    registryDownload.files.set("index.md", "# remote spec\n");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      }),
    );

    await init({
      yes: true,
      registry: `gitlab:local/registry/spec`,
      overwrite: true,
    });

    const config = fs.readFileSync(
      path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml"),
      "utf-8",
    );
    expect(config).toContain("registry:");
    expect(config).toContain("spec:");
    expect(config).toContain("source: gitlab:local/registry/spec");

    const hashFile = JSON.parse(
      fs.readFileSync(
        path.join(tmpDir, DIR_NAMES.WORKFLOW, ".template-hashes.json"),
        "utf-8",
      ),
    ) as { hashes?: Record<string, string> };
    expect(hashFile.hashes?.[".memerig/spec/index.md"]).toBe(
      computeHash("# remote spec\n"),
    );
  });

  it("#22 -y --registry --template records marketplace template source and tracks downloaded spec files", async () => {
    registryDownload.files.set("index.md", "# golang spec\n");
    const index = JSON.stringify({
      version: 1,
      templates: [
        {
          id: "golang-spec",
          type: "spec",
          name: "Golang",
          path: "backend",
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(index),
      }),
    );

    await init({
      yes: true,
      registry: "gitlab:local/registry/marketplace",
      template: "golang-spec",
      overwrite: true,
    });

    const config = fs.readFileSync(
      path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml"),
      "utf-8",
    );
    expect(config).toContain("registry:");
    expect(config).toContain("spec:");
    expect(config).toContain("source: gitlab:local/registry/marketplace");
    expect(config).toContain("template: golang-spec");

    const hashFile = JSON.parse(
      fs.readFileSync(
        path.join(tmpDir, DIR_NAMES.WORKFLOW, ".template-hashes.json"),
        "utf-8",
      ),
    ) as { hashes?: Record<string, string> };
    expect(hashFile.hashes?.[".memerig/spec/index.md"]).toBe(
      computeHash("# golang spec\n"),
    );
  });

  it("#23 existing project --registry --template still refreshes spec and records source", async () => {
    await init({ yes: true, user: "alice" });

    registryDownload.files.set("index.md", "# refreshed golang spec\n");
    const index = JSON.stringify({
      version: 1,
      templates: [
        {
          id: "golang-spec",
          type: "spec",
          name: "Golang",
          path: "backend",
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(index),
      }),
    );

    await init({
      yes: true,
      user: "alice",
      registry: "gitlab:local/registry/marketplace",
      template: "golang-spec",
      overwrite: true,
    });

    const config = fs.readFileSync(
      path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml"),
      "utf-8",
    );
    expect(config).toContain("source: gitlab:local/registry/marketplace");
    expect(config).toContain("template: golang-spec");
    expect(
      fs.readFileSync(path.join(tmpDir, PATHS.SPEC, "index.md"), "utf-8"),
    ).toBe("# refreshed golang spec\n");

    const hashFile = JSON.parse(
      fs.readFileSync(
        path.join(tmpDir, DIR_NAMES.WORKFLOW, ".template-hashes.json"),
        "utf-8",
      ),
    ) as { hashes?: Record<string, string> };
    expect(hashFile.hashes?.[".memerig/spec/index.md"]).toBe(
      computeHash("# refreshed golang spec\n"),
    );
  });

  it("#19 polyrepo: writes git: true for sibling .git packages", async () => {
    // Two sibling .git directories — polyrepo fallback should pick them up
    fs.mkdirSync(path.join(tmpDir, "frontend", ".git"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "backend", ".git"), { recursive: true });

    await init({ yes: true, monorepo: true });

    const configPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml");
    expect(fs.existsSync(configPath)).toBe(true);

    const configContent = fs.readFileSync(configPath, "utf-8");
    // Slice off only the auto-generated section so commented-out template
    // examples (which legitimately mention `type: submodule`) do not pollute
    // the assertion.
    const generatedIdx = configContent.indexOf(
      "# Auto-detected monorepo packages",
    );
    expect(generatedIdx).toBeGreaterThanOrEqual(0);
    const generated = configContent.slice(generatedIdx);

    expect(generated).toContain("packages:");
    expect(generated).toContain("frontend:");
    expect(generated).toContain("backend:");
    expect(generated).toContain("path: frontend");
    expect(generated).toContain("path: backend");
    // Polyrepo packages should be marked git: true, NOT type: submodule
    expect(generated).toContain("git: true");
    expect(generated).not.toContain("type: submodule");
  });

  it("#18 monorepo: re-init does not duplicate packages in config.yaml", async () => {
    setupPnpmWorkspace(tmpDir, [{ rel: "packages/lib", name: "lib" }]);

    await init({ yes: true, force: true, monorepo: true });
    await init({ yes: true, force: true, monorepo: true });

    const configContent = fs.readFileSync(
      path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml"),
      "utf-8",
    );
    // packages: should appear exactly once
    const matches = configContent.match(/^packages\s*:/gm);
    expect(matches).toHaveLength(1);
  });

  // GitHub issue #267 — Windows users silently lose SessionStart injection
  // because Python cold start exceeds the historical 10s timeout. Defaults
  // were bumped to 30s (SessionStart) / 15s (UserPromptSubmit). This guards
  // against future drift on the most common install path.
  it("#19 init writes bumped hook timeouts (issue #267)", async () => {
    await init({ yes: true, claude: true });

    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    ) as {
      hooks: {
        SessionStart: { hooks: { timeout: number }[] }[];
        UserPromptSubmit: { hooks: { timeout: number }[] }[];
      };
    };

    for (const entry of settings.hooks.SessionStart) {
      for (const hook of entry.hooks) {
        expect(hook.timeout).toBeGreaterThanOrEqual(30);
      }
    }
    for (const entry of settings.hooks.UserPromptSubmit) {
      for (const hook of entry.hooks) {
        expect(hook.timeout).toBeGreaterThanOrEqual(15);
      }
    }
  });

  // ===========================================================================
  // Claude Code statusLine interactive opt-in (--with-statusline)
  // ===========================================================================

  /** Install an inquirer mock that answers the tools checkbox with claude and
   *  the statusLine confirm with the given answer. Records every statusLine
   *  confirm question so tests can assert it fired (or not) and its default. */
  async function installStatuslinePromptMock(
    withStatusline: boolean,
  ): Promise<{ confirms: { name?: string; default?: boolean }[] }> {
    const inquirer = (await import("inquirer")).default;
    const confirms: { name?: string; default?: boolean }[] = [];
    vi.mocked(inquirer.prompt).mockImplementation(((questions: unknown) => {
      const q = Array.isArray(questions) ? questions[0] : questions;
      const question = q as { name?: string; default?: boolean };
      if (question.name === "tools") {
        return Promise.resolve({ tools: ["claude"] });
      }
      if (question.name === "withStatusline") {
        confirms.push(question);
        return Promise.resolve({ withStatusline });
      }
      return Promise.resolve({});
    }) as never);
    return { confirms };
  }

  it("#24 interactive init: statusLine confirm Yes installs statusline artifacts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { confirms } = await installStatuslinePromptMock(true);

    await init({ user: "alice", claude: true });

    // Asked exactly once, defaulting to No
    expect(confirms).toHaveLength(1);
    expect(confirms[0].default).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, ".claude", "hooks", "statusline.py")),
    ).toBe(true);
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(settings).toHaveProperty("statusLine");
  });

  it("#25 interactive init: statusLine confirm No (default) installs nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { confirms } = await installStatuslinePromptMock(false);

    await init({ user: "alice", claude: true });

    expect(confirms).toHaveLength(1);
    expect(
      fs.existsSync(path.join(tmpDir, ".claude", "hooks", "statusline.py")),
    ).toBe(false);
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(settings).not.toHaveProperty("statusLine");
  });

  it("#26 -y mode never shows the statusLine confirm", async () => {
    const { confirms } = await installStatuslinePromptMock(true);

    await init({ yes: true, claude: true });

    expect(confirms).toHaveLength(0);
    expect(
      fs.existsSync(path.join(tmpDir, ".claude", "hooks", "statusline.py")),
    ).toBe(false);
  });

  it("#27 --with-statusline skips the confirm and installs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    // Would answer No if (wrongly) asked — flag must win without prompting
    const { confirms } = await installStatuslinePromptMock(false);

    await init({ user: "alice", claude: true, withStatusline: true });

    expect(confirms).toHaveLength(0);
    expect(
      fs.existsSync(path.join(tmpDir, ".claude", "hooks", "statusline.py")),
    ).toBe(true);
  });

  it("#28 reinit add-platform: statusLine confirm fires for newly added claude", async () => {
    // user is required so the bootstrap task is created — otherwise the second
    // init routes through the aborted-init recovery instead of handleReinit
    await init({ yes: true, cursor: true, user: "alice" });
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(false);

    const { confirms } = await installStatuslinePromptMock(true);
    await init({ claude: true });

    expect(confirms).toHaveLength(1);
    expect(confirms[0].default).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, ".claude", "hooks", "statusline.py")),
    ).toBe(true);
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(settings).toHaveProperty("statusLine");
  });

  it("#28a issue #500: reinit configures Claude when native .claude settings already exist", async () => {
    const nativeSettingsPath = path.join(tmpDir, ".claude", "settings.json");
    fs.mkdirSync(path.dirname(nativeSettingsPath), { recursive: true });
    fs.writeFileSync(nativeSettingsPath, '{"permissions":{"allow":[]}}\n');

    await init({ yes: true, codex: true, user: "alice" });
    expect(
      fs.existsSync(
        path.join(tmpDir, ".claude", "skills", "meta", "SKILL.md"),
      ),
    ).toBe(false);

    await init({ yes: true, claude: true });

    expect(
      fs.existsSync(
        path.join(tmpDir, ".claude", "skills", "meta", "SKILL.md"),
      ),
    ).toBe(true);
    expect(fs.readFileSync(nativeSettingsPath, "utf-8")).toBe(
      '{"permissions":{"allow":[]}}\n',
    );
  });

  it("#29 reinit add-platform: no confirm when claude is already configured", async () => {
    await init({ yes: true, claude: true, user: "alice" });

    const { confirms } = await installStatuslinePromptMock(true);
    // Re-running with --claude skips the already-configured platform — the
    // confirm must be pre-filtered out, not asked and then silently ignored
    await init({ claude: true });

    expect(confirms).toHaveLength(0);
    expect(
      fs.existsSync(path.join(tmpDir, ".claude", "hooks", "statusline.py")),
    ).toBe(false);
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(settings).not.toHaveProperty("statusLine");
  });
});
