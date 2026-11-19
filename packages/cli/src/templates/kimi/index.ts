/**
 * Kimi Code template module.
 *
 * Kimi Code is a class-2 pull-based platform:
 * - Workflow/bundled skills go to the shared `.agents/skills/` root via the
 *   neutral resolver (byte-identical to Codex/Gemini/Pi writes).
 * - User-invocable entry points (`start` / `continue` /
 *   `finish-work`, invoked as `/skill:<name>`) and the MemeRig
 *   agent prompts live under `.kimi-code/skills/<name>/SKILL.md`.
 * - The same agent prompts are also installed as project-level custom
 *   sub-agent definitions under `.kimi-code/agents/<name>.md`.
 *
 * Kimi has no project-level hooks/settings file MemeRig may write, so no
 * hooks or settings are shipped; memerig-implement / memerig-check get the
 * pull-based prelude, memerig-research stays standalone.
 */

import { createTemplateReader, type AgentTemplate } from "../template-utils.js";

const { listMdAgents } = createTemplateReader(import.meta.url);

/** MemeRig agent prompts (memerig-implement, memerig-check, memerig-research), installed as Kimi skills. */
export function getAllAgents(): AgentTemplate[] {
  return listMdAgents();
}
