import fs from "node:fs";
import * as os from "node:os";
import path from "node:path";
import type { MemProjectSummary } from "memerig-core/mem";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalize(candidate: string): string {
  const clean = path.resolve(candidate);
  return process.platform === "win32" ? clean.toLowerCase() : clean;
}

/** Read the opt-in catalog without modifying it. Verify each checkout's ID before using its session metadata. */
export function registeredProjectSummaries(
  rows: readonly MemProjectSummary[],
): {
  projectId: string;
  checkouts: string[];
  last_active: string;
  sessions: number;
  by_platform: Record<string, number>;
}[] {
  const catalogPath = path.join(os.homedir(), ".memerig", "projects.json");
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  if (!object(data) || data.schemaVersion !== 1 || !object(data.projects)) {
    throw new Error(`Invalid project catalog: ${catalogPath}`);
  }
  const projects = Object.entries(data.projects).flatMap(
    ([projectId, entries]) => {
      if (!Array.isArray(entries))
        throw new Error(`Invalid project catalog: ${catalogPath}`);
      const checkouts: string[] = [];
      for (const checkout of entries) {
        if (typeof checkout !== "string" || !path.isAbsolute(checkout)) {
          throw new Error(`Invalid project checkout: ${catalogPath}`);
        }
        try {
          const config = fs.readFileSync(
            path.join(checkout, ".memerig", "config.yaml"),
            "utf-8",
          );
          const id =
            /^project_id:[ \t]*(["']?)([a-f0-9-]{36})\1[ \t]*(?:#[^\r\n]*)?\r?$/m.exec(
              config,
            )?.[2];
          if (
            id === projectId &&
            !/^task_owner:[ \t]*["']?parent\b/m.test(config)
          )
            checkouts.push(checkout);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
      return checkouts.length
        ? [
            {
              projectId,
              checkouts,
              last_active: "",
              sessions: 0,
              by_platform: {} as Record<string, number>,
            },
          ]
        : [];
    },
  );
  const byCheckout = new Map(
    projects.flatMap((project) =>
      project.checkouts.map(
        (checkout) => [normalize(checkout), project] as const,
      ),
    ),
  );
  for (const row of rows) {
    let directory = normalize(row.cwd);
    let project = byCheckout.get(directory);
    while (!project && path.dirname(directory) !== directory) {
      directory = path.dirname(directory);
      project = byCheckout.get(directory);
    }
    if (!project) continue;
    project.sessions += row.sessions;
    if (row.last_active > project.last_active)
      project.last_active = row.last_active;
    for (const [platform, count] of Object.entries(row.by_platform)) {
      project.by_platform[platform] =
        (project.by_platform[platform] ?? 0) + count;
    }
  }
  return projects.sort(
    (a, b) =>
      b.last_active.localeCompare(a.last_active) ||
      a.projectId.localeCompare(b.projectId),
  );
}
