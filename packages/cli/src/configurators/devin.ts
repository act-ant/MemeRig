import { AI_TOOLS } from "../types/ai-tools.js";
import { collectBothTemplates } from "./shared.js";

/**
 * The Devin (formerly Windsurf) file set — written at init and diffed by
 * `memerig update`.
 * - workflows/ — start + finish-work as slash commands
 * - skills/{name}/SKILL.md — auto-triggered skills from `common/skills/`
 */
export function collectDevinTemplates(): Map<string, string> {
  return collectBothTemplates(
    AI_TOOLS.devin.templateContext,
    (n) => `.devin/workflows/memerig-${n}.md`,
    ".devin/skills",
  );
}
