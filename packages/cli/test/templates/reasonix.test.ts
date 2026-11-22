import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getAllAgents } from "../../src/templates/reasonix/index.js";
import {
  collectReasonixTemplates,
} from "../../src/configurators/reasonix.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

// Reasonix ships skills-only; subagent skills carry `runAs: subagent`
// frontmatter so Reasonix spawns them as isolated subagent loops.
const EXPECTED_AGENT_NAMES = ["memerig-check", "memerig-implement"];

describe("reasonix getAllAgents", () => {
  it("returns the expected agent set", () => {
    const agents = getAllAgents();
    const names = agents.map((a) => a.name).sort();
    expect(names).toEqual(EXPECTED_AGENT_NAMES);
  });
});

describe("reasonix agent frontmatter", () => {
  for (const name of EXPECTED_AGENT_NAMES) {
    it(`${name}.md frontmatter declares runAs: subagent`, () => {
      const filePath = path.join(
        repoRoot,
        "packages/templates/assets/reasonix/agents",
        `${name}.md`,
      );
      const content = fs.readFileSync(filePath, "utf-8");
      const fm = content.split("---\n")[1] ?? "";

      // runAs: subagent is what makes Reasonix invoke these as an isolated
      // subagent loop instead of a regular slash-skill invocation.
      expect(fm).toMatch(/^runAs:\s*subagent\s*$/m);
      // Name must match the file basename so Reasonix can address the skill.
      const nameMatch = fm.match(/^name:\s*(.+)$/m);
      expect(nameMatch?.[1]?.trim()).toBe(name);
      // Description must be a single non-empty line (Reasonix shows it in the
      // skill picker; YAML block-scalar form would render empty).
      const descMatch = fm.match(/^description:\s*(.+)$/m);
      expect(descMatch?.[1]?.trim().length ?? 0).toBeGreaterThan(0);
    });
  }
});

describe("collectReasonixTemplates", () => {
  it("writes both subagent skills under .reasonix/skills/", () => {
    const files = collectReasonixTemplates();
    expect(files.has(".reasonix/skills/memerig-check/SKILL.md")).toBe(true);
    expect(files.has(".reasonix/skills/memerig-implement/SKILL.md")).toBe(true);
  });

  it("subagent skills replace the same-role workflow skill", () => {
    // memerig-check takes over the `check` role, so the shared resolver must
    // not also emit `.reasonix/skills/check/SKILL.md` alongside it.
    const files = collectReasonixTemplates();
    expect(files.has(".reasonix/skills/check/SKILL.md")).toBe(false);
    const implementPaths = [...files.keys()].filter((p) =>
      p.endsWith("/memerig-implement/SKILL.md"),
    );
    expect(implementPaths).toHaveLength(1);
  });

  it("subagent SKILL.md content carries runAs: subagent frontmatter", () => {
    const files = collectReasonixTemplates();
    const checkBody = files.get(".reasonix/skills/memerig-check/SKILL.md");
    const implementBody = files.get(
      ".reasonix/skills/memerig-implement/SKILL.md",
    );
    expect(checkBody).toMatch(/^runAs:\s*subagent\s*$/m);
    expect(implementBody).toMatch(/^runAs:\s*subagent\s*$/m);
  });
});
