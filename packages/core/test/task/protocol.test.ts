import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  emptyTaskRecord,
  loadTaskRecord,
  normalizeTaskStatus,
  taskLifecycleState,
  validateTaskRecordV1,
  writeTaskRecord,
  type MemerigTaskRecord,
} from "../../src/task/index.js";

function v1Record(
  overrides: Partial<MemerigTaskRecord> = {},
): MemerigTaskRecord {
  return emptyTaskRecord({
    id: "7be9eba6-7463-46b0-87b7-8d9b9a067b9a",
    name: "protocol",
    title: "Protocol",
    createdAt: "2026-11-19T09:00:00Z",
    updatedAt: "2026-11-19T10:30:00Z",
    schemaVersion: 1,
    ...overrides,
  });
}

describe("task protocol statuses", () => {
  it("normalizes proposal aliases to the stored vocabulary", () => {
    expect(normalizeTaskStatus("open")).toBe("planning");
    expect(normalizeTaskStatus("done")).toBe("completed");
    expect(normalizeTaskStatus("cancelled")).toBe("canceled");
    expect(normalizeTaskStatus("in_progress")).toBe("in_progress");
    expect(normalizeTaskStatus("bogus")).toBeNull();
  });

  it("projects lifecycle state without losing closed semantics", () => {
    expect(taskLifecycleState("planning")).toBe("open");
    expect(taskLifecycleState("in_progress")).toBe("in_progress");
    expect(taskLifecycleState("review")).toBe("in_progress");
    expect(taskLifecycleState("completed")).toBe("closed");
    expect(taskLifecycleState("done")).toBe("closed");
    expect(taskLifecycleState("canceled")).toBe("canceled");
  });
});

describe("validateTaskRecordV1", () => {
  it("accepts a complete v1 record", () => {
    expect(validateTaskRecordV1(v1Record())).toEqual([]);
  });

  it("requires closedAt for a closed status", () => {
    const errors = validateTaskRecordV1(
      v1Record({ status: "completed" }),
    );
    expect(errors.join("; ")).toMatch(/closedAt is required/);
  });

  it("rejects closedAt on an active record", () => {
    const errors = validateTaskRecordV1(
      v1Record({ closedAt: "2026-11-19T11:00:00Z" }),
    );
    expect(errors.join("; ")).toMatch(/closedAt must be absent/);
  });

  it("rejects a non-UUID id and malformed timestamps", () => {
    const errors = validateTaskRecordV1({
      ...v1Record(),
      id: "legacy-slug",
      updatedAt: "yesterday",
    });
    expect(errors.join("; ")).toMatch(/UUID v4/);
    expect(errors.join("; ")).toMatch(/updatedAt/);
  });

  it("rejects duplicate labels and un-namespaced extensions", () => {
    const errors = validateTaskRecordV1(
      v1Record({
        labels: ["a", "a"],
        extensions: { board: { id: "x" } },
      }),
    );
    expect(errors.join("; ")).toMatch(/labels must not contain duplicates/);
    expect(errors.join("; ")).toMatch(/must be namespaced/);
  });

  it("rejects a self parent edge", () => {
    const record = v1Record();
    const errors = validateTaskRecordV1({ ...record, parentId: record.id });
    expect(errors.join("; ")).toMatch(/cannot point at the task itself/);
  });
});

describe("v1 fields round-trip through task.json", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "memerig-core-protocol-"));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("persists completion time and adapter metadata in a v1 record", () => {
    const dir = path.join(tmp, "11-19-protocol");
    const record = v1Record({
      status: "completed",
      closedAt: "2026-11-19T10:30:00Z",
      labels: ["backend", "docs"],
      nextAction: "run the smoke",
      parentId: "11111111-1111-4111-8111-111111111111",
      legacyId: "11-19-protocol",
      extensions: { "com.example.board": { id: "42" } },
    });
    writeTaskRecord({ taskDir: dir, record });

    const onDisk = JSON.parse(
      fs.readFileSync(path.join(dir, "task.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(onDisk).toMatchObject({
      schemaVersion: 1,
      status: "completed",
      closedAt: record.closedAt,
      extensions: { "com.example.board": { id: "42" } },
    });
    expect(loadTaskRecord({ taskDir: dir })).toEqual(record);
  });
});
