/**
 * Markdown templates for MemeRig workflow
 *
 * These are GENERIC templates for new projects.
 * Structure templates use .md.txt extension as they are generic templates.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { templateDirectory } from "../template-utils.js";

const __dirname = templateDirectory(import.meta.url);

/**
 * Read a template file from src/templates/markdown/
 */
function readLocalTemplate(filename: string): string {
  const filePath = join(__dirname, filename);
  return readFileSync(filePath, "utf-8");
}

// =============================================================================
// Root files for new projects
// =============================================================================

export const agentsMdContent: string = readLocalTemplate("agents.md");

// Workspace index template (developer work records)
export const workspaceIndexContent: string =
  readLocalTemplate("workspace-index.md");

// Backwards compatibility alias
export const agentProgressIndexContent = workspaceIndexContent;

// Gitignore (template file - .gitignore is ignored by npm)
export const workflowGitignoreContent: string =
  readLocalTemplate("gitignore.txt");

// =============================================================================
// Starter spec (generic template for new projects, not dogfooded)
//
// A new project starts with an EMPTY spec. `from scratch` seeds only this
// README, which explains the layout; placeholder guideline files were removed
// because they read as approved conventions that nobody had approved.
// =============================================================================

export const specReadmeContent: string = readLocalTemplate(
  "spec/README.md.txt",
);
