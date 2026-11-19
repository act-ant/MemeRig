/**
 * Reasonix configurator.
 *
 * Reasonix (DeepSeek-Reasonix) stores skills as `.reasonix/skills/<name>/SKILL.md`
 * with YAML frontmatter (name + description). Slash commands are code-built-in,
 * so no commands directory is generated.
 *
 * Workflow templates are surfaced as unprefixed skills (invocable via
 * `/skill start`, `/skill continue`, etc.).
 * Subagent skills (memerig-implement, memerig-check) use `runAs: subagent`
 * frontmatter so Reasonix spawns them as isolated subagent loops; each one
 * replaces the unprefixed workflow skill of the same role (`check`).
 */

import { AI_TOOLS } from "../types/ai-tools.js";
import { getAllAgents } from "../templates/reasonix/index.js";
import {
  collectSkillTemplates,
  resolveAllAsSkills,
  resolveBundledSkills,
} from "./shared.js";

/**
 * The Reasonix file set — written at init and diffed by `memerig update`.
 */
export function collectReasonixTemplates(): Map<string, string> {
  const config = AI_TOOLS.reasonix;
  const ctx = config.templateContext;
  const files = new Map<string, string>();

  // Workflow skills whose role a subagent skill takes over (memerig-check
  // replaces check) are dropped so Reasonix offers one entry per role.
  const agentNames = new Set(getAllAgents().map((a) => a.name));
  const skills = resolveAllAsSkills(ctx).filter(
    (s) => !agentNames.has(`memerig-${s.name}`),
  );

  for (const [filePath, content] of collectSkillTemplates(
    ".reasonix/skills",
    skills,
    resolveBundledSkills(ctx),
  )) {
    files.set(filePath, content);
  }

  // Subagent skills (memerig-implement, memerig-check) — written with
  // runAs: subagent frontmatter for isolated subagent loops.
  for (const agent of getAllAgents()) {
    files.set(`.reasonix/skills/${agent.name}/SKILL.md`, agent.content);
  }

  return files;
}
