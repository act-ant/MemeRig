/**
 * Integration tests for the repository-native task protocol v1.
 *
 * Stamps the real templates into a fresh `.memerig/` tree and exercises the
 * actual `python <scripts>/task.py` lifecycle: create without a developer or
 * session identity, resume by id, stale-write rejection, idempotent in-place
 * complete, the closed view, and preview/apply migration with a backup.
 */
import { execFileSync, spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TEMPLATE_SCRIPTS = path.resolve(
  __dirname,
  "../../../templates/assets/memerig/scripts",
);

function findPython(): string | null {
  for (const candidate of ["python3", "python"]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // try the next interpreter name
    }
  }
  return null;
}

const PYTHON = findPython();

function setupRepo(tmp: string): void {
  fs.mkdirSync(path.join(tmp, ".memerig"), { recursive: true });
  fs.cpSync(TEMPLATE_SCRIPTS, path.join(tmp, ".memerig", "scripts"), {
    recursive: true,
  });
}

function runTask(repo: string, ...args: string[]): SpawnSyncReturns<string> {
  return runSessionTask(repo, "", ...args);
}

function runSessionTask(
  repo: string,
  context: string,
  ...args: string[]
): SpawnSyncReturns<string> {
  return spawnSync(PYTHON ?? "python", [".memerig/scripts/task.py", ...args], {
    cwd: repo,
    encoding: "utf-8",
    env: { ...process.env, MEMERIG_DEVELOPER: "", MEMERIG_CONTEXT_ID: context },
  });
}

function jsonOutput(result: SpawnSyncReturns<string>): Record<string, unknown> {
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function asObject(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function writeLegacy(
  repo: string,
  relativeDir: string,
  overrides: Record<string, unknown> = {},
): void {
  const dir = path.join(repo, ".memerig", "tasks", relativeDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "prd.md"), `${relativeDir}\n`);
  const name = path.basename(relativeDir);
  fs.writeFileSync(
    path.join(dir, "task.json"),
    JSON.stringify({
      id: name,
      name,
      title: name,
      description: `${name} description`,
      status: "planning",
      priority: "P2",
      creator: "dev",
      assignee: "dev",
      createdAt: "2026-11-19",
      completedAt: null,
      subtasks: [],
      children: [],
      parent: null,
      relatedFiles: [],
      notes: "",
      meta: {},
      ...overrides,
    }),
  );
}

describe.skipIf(PYTHON === null)("task protocol v1", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "memerig-task-protocol-"));
    setupRepo(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates without identity, resumes by id, rejects stale writes, and closes idempotently", () => {
    const created = jsonOutput(
      runTask(
        tmp,
        "create",
        "Protocol smoke",
        "--description",
        "clean clone run",
        "--slug",
        "protocol-smoke",
        "--no-start",
        "--json",
      ),
    );
    const task = created.task as Record<string, unknown>;
    expect(task.schemaVersion).toBe(1);
    expect(task.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(task.creator).toBe("");
    expect(task.assignee).toBe("");
    expect(typeof created.version).toBe("string");

    const taskDir = path.join(tmp, String(created.path));
    expect(fs.existsSync(path.join(taskDir, "task.json"))).toBe(true);

    // Resume by UUID in another process, and by the legacy slug selector.
    const shownById = jsonOutput(
      runTask(tmp, "show", String(task.id), "--json"),
    );
    expect(shownById.version).toBe(created.version);
    const shownBySlug = jsonOutput(
      runTask(tmp, "show", "protocol-smoke", "--json"),
    );
    expect(asObject(shownBySlug.task).id).toBe(task.id);

    // Stale snapshot cannot overwrite.
    const stale = runTask(
      tmp,
      "update",
      String(task.id),
      "--next-action",
      "stale write",
      "--expect-version",
      "deadbeef",
      "--json",
    );
    expect(stale.status).toBe(1);
    const stalePayload = JSON.parse(stale.stdout) as Record<string, unknown>;
    const staleError = stalePayload.error as Record<string, unknown>;
    const staleDetails = staleError.details as Record<string, unknown>;
    expect(staleError.code).toBe("stale_version");
    expect(staleDetails.currentVersion).toBe(created.version);

    const updated = jsonOutput(
      runTask(
        tmp,
        "update",
        String(task.id),
        "--next-action",
        "resume here",
        "--expect-version",
        String(created.version),
        "--json",
      ),
    );
    expect(asObject(updated.task).nextAction).toBe("resume here");
    expect(updated.changed).toEqual(["nextAction"]);

    const first = jsonOutput(
      runTask(tmp, "complete", String(task.id), "--json"),
    );
    const firstTask = asObject(first.task);
    expect(firstTask.status).toBe("completed");
    expect(firstTask.closedAt).toBeTruthy();
    expect(first.changed).toBe(true);

    const second = jsonOutput(
      runTask(tmp, "complete", "protocol-smoke", "--json"),
    );
    const secondTask = asObject(second.task);
    expect(secondTask.id).toBe(task.id);
    expect(secondTask.closedAt).toBe(firstTask.closedAt);
    expect(second.version).toBe(first.version);
    expect(second.alreadyCompleted).toBe(true);
    expect(asObject(second.location).dir).toBe(created.path);
    expect(fs.existsSync(path.join(taskDir, "task.json"))).toBe(true);

    const closed = jsonOutput(runTask(tmp, "list", "--closed", "--json"));
    const closedTask = (closed.tasks as Record<string, unknown>[]).find(
      (item) => item.id === task.id,
    );
    expect(closedTask?.closed).toBe(true);
    expect(closedTask?.archived).toBe(false);
  });

  it("starts by UUID in an inherited module and closes only matching session pointers", () => {
    execFileSync("git", ["init", "-q"], { cwd: tmp });
    fs.writeFileSync(
      path.join(tmp, ".memerig", "config.yaml"),
      "project_id: 40ce3255-ca24-4453-a5b9-5925fa404950\n",
    );
    const child = path.join(tmp, "module");
    setupRepo(child);
    execFileSync("git", ["init", "-q"], { cwd: child });
    fs.writeFileSync(path.join(child, ".memerig", "config.yaml"), "task_owner: parent\n");

    const created = jsonOutput(runSessionTask(child, "author", "create", "Parent", "--description", "Work", "--json"));
    const parentId = String(asObject(created.task).id);
    const childTask = jsonOutput(runSessionTask(tmp, "unrelated", "create", "Child", "--description", "Still open", "--parent", String(created.path), "--json"));
    const childId = asObject(childTask.task).id;

    const started = runSessionTask(child, "reviewer", "start", parentId);
    expect(started.status, started.stderr).toBe(0);
    const current = jsonOutput(runSessionTask(tmp, "reviewer", "current", "--json"));
    expect(current.current_task).toMatchObject({ id: parentId, status: "in_progress" });

    const stale = runSessionTask(child, "reviewer", "complete", parentId, "--expect-version", String(created.version));
    expect(stale.status).toBe(1);
    expect(runSessionTask(child, "reviewer", "current").status).toBe(0);

    const completed = jsonOutput(runSessionTask(child, "reviewer", "complete", parentId, "--json"));
    expect(completed.location).toMatchObject({ dir: created.path, closed: true });
    for (const context of ["author", "reviewer"]) {
      const ended = runSessionTask(child, context, "current", "--json");
      expect(ended.status).toBe(1);
      expect(JSON.parse(ended.stdout).current_task).toBeNull();
    }
    expect(jsonOutput(runSessionTask(tmp, "unrelated", "current", "--json")).current_task).toMatchObject({ id: childId });
    expect(runSessionTask(child, "reviewer", "start", parentId).status).toBe(1);

    const visible = runTask(child, "list");
    expect(visible.status, visible.stderr).toBe(0);
    expect(visible.stdout).toContain(path.basename(String(childTask.path)));
    expect(visible.stdout).not.toContain(path.basename(String(created.path)));
    expect(jsonOutput(runTask(child, "list", "--json")).tasks).toMatchObject([{ id: childId }]);
    expect(jsonOutput(runTask(child, "list", "--closed", "--json")).tasks).toMatchObject([{ id: parentId }]);
  });

  it("migrates active and archived legacy records with hierarchy and a rerunnable backup", () => {
    writeLegacy(tmp, "11-19-parent", {
      children: ["11-19-child"],
    });
    writeLegacy(tmp, "11-19-child", {
      status: "in_progress",
      parent: "11-19-parent",
    });
    writeLegacy(tmp, "archive/2026-10/10-01-old", {
      status: "completed",
      createdAt: "2026-10-01",
      completedAt: "2026-10-02",
    });

    const preview = jsonOutput(runTask(tmp, "migrate", "--json"));
    const previewSummary = asObject(preview.summary);
    expect(previewSummary.total).toBe(3);
    expect(previewSummary.blocked).toBe(0);
    const child = (preview.entries as Record<string, unknown>[]).find((entry) =>
      String(entry.path).endsWith("11-19-child"),
    );
    expect(child?.changes).toContain("parentId");

    const applied = jsonOutput(runTask(tmp, "migrate", "--apply", "--json"));
    expect(applied.changed).toBe(3);
    expect(applied.backupPath).toBeTruthy();
    expect(fs.existsSync(path.join(String(applied.backupPath), "manifest.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(String(applied.backupPath), "tasks", "11-19-parent", "task.json"))).toBe(
      true,
    );
    expect(Object.keys(asObject(applied.oldToNew))).toHaveLength(3);

    const rerun = jsonOutput(runTask(tmp, "migrate", "--apply", "--json"));
    expect(rerun.changed).toBe(0);
    expect(rerun.backupPath).toBeNull();

    const childRecord = JSON.parse(
      fs.readFileSync(
        path.join(tmp, ".memerig", "tasks", "11-19-child", "task.json"),
        "utf-8",
      ),
    ) as Record<string, unknown>;
    expect(childRecord.parentId).toBeTruthy();
    expect(childRecord.parent).toBe("11-19-parent");

    const archived = jsonOutput(
      runTask(tmp, "show", "10-01-old", "--json"),
    );
    const archivedTask = asObject(archived.task);
    const archivedLocation = asObject(archived.location);
    expect(archivedTask.id).not.toBe("10-01-old");
    expect(archivedTask.legacyId).toBe("10-01-old");
    expect(archivedLocation.closed).toBe(true);
    expect(archivedLocation.archived).toBe(true);

    const closed = jsonOutput(runTask(tmp, "list", "--closed", "--json"));
    const archivedItem = (closed.tasks as Record<string, unknown>[]).find(
      (item) => item.dir_name === "10-01-old",
    );
    expect(archivedItem?.archived).toBe(true);
  });
});
