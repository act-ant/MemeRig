# `memerig workflow` Command

`memerig workflow` lists and switches the project's active `.memerig/workflow.md`
template. It is the only command that deliberately replaces an existing
workflow variant in-place after init.

## Scenario: workflow marketplace templates and switcher

### 1. Scope / Trigger

Trigger: adding a user-facing command and init flags that change a runtime-parsed
template, marketplace lookup behavior, and `.memerig/.template-hashes.json`
ownership.

This spec applies when editing:

- `packages/cli/src/commands/workflow.ts`
- `packages/cli/src/utils/workflow-resolver.ts`
- `packages/cli/src/commands/init.ts` workflow-selection code
- `packages/cli/src/configurators/workflow.ts`
- `marketplace/workflows/**`
- workflow-related tests

### 2. Signatures

CLI signatures:

```text
memerig workflow
memerig workflow --list
memerig workflow --template <id>
memerig workflow --marketplace <source> --template <id>
memerig workflow --template <id> --force
memerig workflow --template <id> --create-new

memerig init --workflow <id>
memerig init --workflow-source <source> --workflow <id>
```

Resolver signatures:

```typescript
export const NATIVE_WORKFLOW_ID = "native";

export interface ResolvedWorkflowTemplate {
  id: string;
  type: "workflow";
  name: string;
  description?: string;
  path: string;
  content: string;
  source: "bundled" | "marketplace";
}

export interface WorkflowTemplateListing {
  id: string;
  type: "workflow";
  name: string;
  description?: string;
  path: string;
  source: "bundled" | "marketplace";
}

export function listWorkflowTemplates(options?: {
  source?: string;
}): Promise<{ templates: WorkflowTemplateListing[]; errorMessage?: string }>;

export function resolveWorkflowTemplate(
  id: string,
  options?: { source?: string },
): Promise<ResolvedWorkflowTemplate>;
```

Configurator signature:

```typescript
export interface WorkflowOptions {
  projectType: ProjectType;
  skipSpecTemplates?: boolean;
  packages?: DetectedPackage[];
  remoteSpecPackages?: Set<string>;
  workflowMdOverride?: string;
}
```

### 3. Contracts

Marketplace entries use `type: "workflow"` and point to one markdown file:

```json
{
  "id": "tdd",
  "type": "workflow",
  "name": "TDD Workflow",
  "description": "MemeRig workflow variant that drives Phase 2 with one red / green / refactor behavior slice at a time",
  "path": "workflows/tdd/workflow.md",
  "tags": ["workflow", "tdd", "testing"]
}
```

Required built-ins:

- `native`
- `tdd`
- `channel-driven-subagent-dispatch`

Ownership contract:

- `native` is MemeRig-managed. After writing it, refresh the
  `.memerig/workflow.md` hash with `updateHashes`.
- Every non-native workflow is user-managed local content. After writing it,
  remove `.memerig/workflow.md` from `.memerig/.template-hashes.json` with
  `removeHash`.
- Do not add `workflow.variant` or any other long-lived config field to make
  `memerig update` chase a selected variant. Switching is an explicit project
  action.

Runtime parser contract:

- Every workflow template must keep `## Phase Index`, `## Phase 1: Plan`,
  `#### X.Y` step headings, platform marker syntax, and all required
  `[workflow-state:*]` blocks.
- SessionStart, per-turn workflow-state hooks, `start`, and
  `get_context.py --mode phase` read the current `.memerig/workflow.md`; do not
  duplicate variant-specific behavior in hook scripts or skills.

Native source-of-truth contract:

- `packages/templates/assets/memerig/workflow.md` is the source of truth for
  native workflow.
- If `marketplace/workflows/native/workflow.md` exists, tests must enforce byte
  identity with the bundled native template.

Optional project practices belong to the selected workflow and root Spec entry
documents. Native/common entry points must read applicable adopted bodies, not
assume that a bundled guide or an existing document enables a practice. The
default Spec template adopts repository-attractor guidance; another preset may
omit it entirely. Keep actual-body routing in both compact breadcrumbs and
expanded instructions. Do not impose a universal attractor interview on TDD,
channel-driven, or third-party workflows. See
[`project-setup.md` § 9](./project-setup.md#9-optional-repository-attractor-guidance).

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| `memerig workflow --template <id>` and current workflow is modified | Exit 1 with guidance to use `--force` or `--create-new`; do not prompt, even on a TTY |
| Interactive `memerig workflow` picker and current workflow is modified | Prompt for overwrite, create-new, or skip |
| `--create-new` | Write a generated `workflow.md.new` file beside `.memerig/workflow.md`; do not change active workflow or hash file |
| `--force` | Overwrite active workflow and apply the native/non-native hash contract |
| Missing workflow id | Throw `WorkflowResolveError` / command error; CLI exits non-zero |
| Marketplace index fetch fails | List can still show bundled native with warning; resolve fails with workflow-specific error |
| Workflow entry path is missing, not `.md`, absolute, or contains `..` | Fail with workflow-specific error |
| `init --workflow missing-id` | Reject; do not print and return success |
| `init --workflow tdd` | Write marketplace content and remove `.memerig/workflow.md` hash |
| `memerig update` after switching to non-native | Treat workflow as modified/user-managed; never silently restore native |

### 5. Good/Base/Bad Cases

- Good: `memerig workflow --template tdd` replaces a pristine native workflow,
  removes the workflow hash, and later `memerig update` leaves TDD content in
  place.
- Base: `memerig init --workflow native` writes bundled native workflow and
  keeps `.memerig/workflow.md` hash-tracked.
- Bad: `memerig workflow --template tdd` writes TDD content and records the TDD
  hash. The next `memerig update` sees a pristine file and overwrites it with
  native workflow.

### 6. Tests Required

Unit tests:

- `resolveWorkflowTemplate("native")` returns bundled content without fetch.
- Marketplace workflow resolution fetches `index.json` and one markdown file.
- Missing id errors mention workflow templates, not spec templates.
- Invalid / escaping workflow paths fail before fetch or file read.

Integration tests:

- `init --workflow native` keeps `.memerig/workflow.md` hash-tracked.
- `init --workflow tdd` writes marketplace content and removes the hash.
- `init --workflow-source <source> --workflow custom-id` writes custom content.
- `init --workflow missing-id` rejects.
- `memerig workflow --template tdd` writes marketplace content and removes the
  hash.
- Explicit `--template` with modified workflow fails even when `stdin.isTTY` is
  true.
- `--create-new` writes a generated `workflow.md.new` file beside `.memerig/workflow.md` and does not touch the active
  workflow or hash.
- `memerig update` after switching to non-native does not restore native.
- Marketplace native mirror matches bundled native workflow when the mirror file
  exists.
- Real `marketplace/workflows/tdd/workflow.md` planning breadcrumbs include the
  TDD gates: observable behavior slices, public interface under test, and mock
  boundaries.

Runtime parsing validation:

```bash
python3 ./.memerig/scripts/get_context.py --mode phase
python3 ./.memerig/scripts/get_context.py --mode phase --step 2.1
python3 ./.memerig/scripts/get_context.py --mode phase --step 2.2 --platform codex
python3 ./.memerig/scripts/get_context.py --mode phase --step 2.1 --platform codex-sub-agent
python3 ./.memerig/scripts/get_context.py --mode phase --step 2.1 --platform claude
```

### 7. Wrong vs Correct

#### Wrong

```typescript
// Records non-native content as the pristine template hash.
fs.writeFileSync(".memerig/workflow.md", tddContent);
updateHashes(cwd, new Map([[PATHS.WORKFLOW_GUIDE_FILE, tddContent]]));
```

This makes `memerig update` auto-replace TDD with bundled native workflow later.

#### Correct

```typescript
fs.writeFileSync(".memerig/workflow.md", tddContent);
removeHash(cwd, PATHS.WORKFLOW_GUIDE_FILE);
```

Missing hash means update conservatively treats the workflow as user-managed and
routes it through the normal modified-file decision path.

#### Wrong

```typescript
if (isInteractive()) {
  await promptForOverwrite();
}
```

An explicit `memerig workflow --template tdd` can hang in a TTY even though it is
a scriptable command path.

#### Correct

```typescript
const explicitTemplate = Boolean(options.template);
if (explicitTemplate || !isInteractive()) {
  throw new WorkflowCommandError("... use --force or --create-new ...");
}
```

Only the no-argument interactive picker may prompt for conflict resolution.
