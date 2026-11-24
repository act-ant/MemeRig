import fs from "node:fs";
import path from "node:path";

import { DIR_NAMES, PATHS } from "../constants/paths.js";
import { copyMemerigDir } from "../templates/extract.js";

// Import memerig templates (generic, not project-specific)
import {
  workflowMdTemplate,
  attractorGuideTemplate,
  configYamlTemplate,
  gitignoreTemplate,
  gitattributesTemplate,
  getAllAgents,
  getAllRules,
} from "../templates/memerig/index.js";

// Import markdown templates
import {
  agentProgressIndexContent,
  specReadmeContent,
} from "../templates/markdown/index.js";

import { writeFile, ensureDir } from "../utils/file-writer.js";
import { replacePythonCommandLiterals } from "./shared.js";
import {
  type ProjectType,
  type DetectedPackage,
} from "../utils/project-detector.js";

/**
 * Options for creating workflow structure
 */
export interface WorkflowOptions {
  /** Detected or specified project type. */
  projectType: ProjectType;
  /** Skip creating local spec templates (when using remote template) — single-repo mode */
  skipSpecTemplates?: boolean;
  /** Detected monorepo packages (enables monorepo spec creation) */
  packages?: DetectedPackage[];
  /** Package names that use remote templates (skip blank spec for these) */
  remoteSpecPackages?: Set<string>;
  /**
   * Optional override for `.memerig/workflow.md` content. When omitted the
   * bundled native template is written. Set by `init --workflow` (or
   * `--workflow-source`) after the resolver has fetched marketplace content.
   * Caller is still responsible for removing the `.memerig/workflow.md` hash
   * entry for non-native workflows so update.ts treats them as user-managed.
   */
  workflowMdOverride?: string;
}

/**
 * Regex used to detect an existing `journal-*.md merge=union` gitattributes
 * rule (any whitespace variant), so `ensureGitattributes` never appends a
 * duplicate entry to a project's pre-existing `.gitattributes`.
 */
const JOURNAL_MERGE_UNION_PATTERN = /journal-\*\.md\s+merge=union/;

/**
 * Ensure the project-root `.gitattributes` carries the journal `merge=union`
 * rule, without ever overwriting a user's existing file wholesale.
 *
 * - No `.gitattributes` yet: write the bundled template directly.
 * - Existing file that already has a `journal-*.md merge=union` rule (user's
 *   own or from a previous `memerig init`/`update`): no-op, avoids duplicates.
 * - Existing file without that rule: append the bundled template content.
 *
 * Intentionally does NOT go through the standard `writeFile` conflict-prompt
 * flow — this file is additive-only and never a candidate for whole-file
 * overwrite.
 */
export function ensureGitattributes(cwd: string): void {
  const targetPath = path.join(cwd, ".gitattributes");

  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, gitattributesTemplate);
    return;
  }

  const existing = fs.readFileSync(targetPath, "utf-8");
  if (JOURNAL_MERGE_UNION_PATTERN.test(existing)) {
    return;
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(targetPath, existing + separator + gitattributesTemplate);
}

/**
 * Create workflow structure based on project type
 *
 * This function creates the .memerig/ directory structure by:
 * 1. Copying scripts/ directory directly (dogfooding)
 * 2. Copying workflow.md and .gitignore (dogfooding)
 * 3. Creating workspace/ with index.md
 * 4. Creating tasks/ directory
 * 5. Creating spec/ with templates (not dogfooded - generic templates)
 *
 * @param cwd - Current working directory
 * @param options - Workflow options including project type
 */
export async function createWorkflowStructure(
  cwd: string,
  options?: WorkflowOptions,
): Promise<void> {
  const skipSpecTemplates = options?.skipSpecTemplates ?? false;
  const workflowMd = options?.workflowMdOverride ?? workflowMdTemplate;

  // Create base .memerig directory
  ensureDir(path.join(cwd, DIR_NAMES.WORKFLOW));

  // Copy scripts/ directory from templates
  await copyMemerigDir("scripts", path.join(cwd, PATHS.SCRIPTS), {
    executable: true,
  });

  // Copy workflow.md (native bundled template or selected marketplace variant)
  await writeFile(
    path.join(cwd, PATHS.WORKFLOW_GUIDE_FILE),
    replacePythonCommandLiterals(workflowMd),
  );
  await writeFile(
    path.join(cwd, DIR_NAMES.WORKFLOW, "attractor-guide.md"),
    replacePythonCommandLiterals(attractorGuideTemplate),
  );

  ensureDir(path.join(cwd, PATHS.RULES));
  for (const [ruleFile, content] of getAllRules()) {
    await writeFile(path.join(cwd, PATHS.RULES, ruleFile), content);
  }

  // Project identity, task policy, and custom rules belong to this checkout.
  const memerig = path.join(cwd, DIR_NAMES.WORKFLOW);
  for (const [name, template] of [
    [".gitignore", gitignoreTemplate],
    ["config.yaml", configYamlTemplate],
  ] as const) {
    const target = path.join(memerig, name);
    if (!fs.existsSync(target)) await writeFile(target, template);
  }

  ensureDir(path.join(cwd, PATHS.TASKS));

  // Ensure project-root .gitattributes carries the journal merge=union rule
  // (additive-only — never overwrites a user's existing file wholesale).
  ensureGitattributes(cwd);

  // Dispatch channel runtime agent definitions. These are platform-agnostic
  // MemeRig runtime files consumed by `memerig channel spawn --agent <name>`
  // through `packages/cli/src/commands/channel/agent-loader.ts`. They are
  // dispatched on every init regardless of selected workflow because the user
  // can switch to a channel-driven workflow at any time via `memerig workflow
  // --template`.
  ensureDir(path.join(cwd, PATHS.AGENTS));
  for (const [agentFile, content] of getAllAgents()) {
    await writeFile(path.join(cwd, PATHS.AGENTS, agentFile), content);
  }

  // Create workspace/ with index.md
  ensureDir(path.join(cwd, PATHS.WORKSPACE));
  await writeFile(
    path.join(cwd, PATHS.WORKSPACE, "index.md"),
    replacePythonCommandLiterals(agentProgressIndexContent),
  );

  // Seed the spec directory. A project starts with an EMPTY spec: seeding is
  // only the layout README, never placeholder guideline files that would read
  // as approved conventions. Marketplace/builtin presets install their own
  // spec tree, so they skip this entirely.
  if (!skipSpecTemplates) {
    await createSpecTemplates(cwd);
  }
}

/**
 * Seed an empty `.memerig/spec/` with the layout README.
 *
 * Deliberately does not scaffold `backend/`, `frontend/` or `guides/`
 * documents: placeholder guidelines carry no authority, and generated files
 * that look reviewable are worse than a directory that is visibly empty.
 */
async function createSpecTemplates(cwd: string): Promise<void> {
  const specDir = path.join(cwd, PATHS.SPEC);
  ensureDir(specDir);
  await writeFile(path.join(specDir, "README.md"), specReadmeContent);
}
