import { isPlainObject, type MemerigTaskRecord } from "./schema.js";

/**
 * Task protocol v1 — lifecycle vocabulary and client-side validation.
 *
 * The Python runtime (`.memerig/scripts/common/task_protocol.py`) is the
 * lifecycle writer. This module is the TypeScript half of the same contract:
 * it normalizes the proposal aliases to the canonical stored vocabulary and
 * validates a v1 record before a Node consumer trusts it.
 *
 * Stored vocabulary is compatibility-first:
 *
 *   open      -> planning
 *   in_progress -> in_progress
 *   review    -> review
 *   done/closed -> completed
 *   canceled  -> canceled
 *
 * `completed` and `canceled` are closed. Closing in place never moves the
 * task directory; legacy `archive/` paths remain part of the closed view.
 */

export const TASK_STATUSES = [
  "planning",
  "in_progress",
  "review",
  "completed",
  "canceled",
] as const;

export type CanonicalTaskStatus = (typeof TASK_STATUSES)[number];

/** Product-facing lifecycle state collapsed from the stored status. */
export type TaskLifecycleState =
  | "open"
  | "in_progress"
  | "closed"
  | "canceled";

const STATUS_ALIASES: Record<string, CanonicalTaskStatus> = {
  open: "planning",
  planning: "planning",
  in_progress: "in_progress",
  review: "review",
  done: "completed",
  completed: "completed",
  archived: "completed",
  closed: "completed",
  canceled: "canceled",
  cancelled: "canceled",
};

const CLOSED_STATUSES: ReadonlySet<string> = new Set([
  "completed",
  "canceled",
]);

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const EXTENSION_KEY_RE =
  /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

/** Resolve a proposal/legacy status to its canonical stored value. */
export function normalizeTaskStatus(
  status: string | null | undefined,
): CanonicalTaskStatus | null {
  if (typeof status !== "string") return null;
  return STATUS_ALIASES[status.trim().toLowerCase()] ?? null;
}

export function isClosedTaskStatus(
  status: string | null | undefined,
): boolean {
  const canonical = normalizeTaskStatus(status);
  return canonical !== null && CLOSED_STATUSES.has(canonical);
}

export function isActiveTaskStatus(
  status: string | null | undefined,
): boolean {
  const canonical = normalizeTaskStatus(status);
  return canonical !== null && !CLOSED_STATUSES.has(canonical);
}

export function taskLifecycleState(
  recordOrStatus: MemerigTaskRecord | string | null | undefined,
): TaskLifecycleState {
  const status =
    typeof recordOrStatus === "string"
      ? recordOrStatus
      : recordOrStatus?.status;
  const canonical = normalizeTaskStatus(status);
  if (canonical === null) return "open";
  if (canonical === "canceled") return "canceled";
  if (CLOSED_STATUSES.has(canonical)) return "closed";
  if (canonical === "planning") return "open";
  return "in_progress";
}

/**
 * Structural validation for a v1 record. Returns every problem instead of
 * throwing; `assertTaskRecordV1` is the throwing wrapper.
 *
 * Legacy records (no `schemaVersion`) are not v1 and are reported as such.
 * Timestamps are compared lexicographically because the accepted shape is
 * fixed-width UTC (`YYYY-MM-DDTHH:MM:SSZ`), which sorts chronologically.
 */
export function validateTaskRecordV1(record: unknown): string[] {
  if (!isPlainObject(record)) {
    return ["task record must be a JSON object"];
  }
  const errors: string[] = [];
  if (record.schemaVersion !== 1) {
    errors.push("task.schemaVersion must be 1");
  }
  if (
    typeof record.id !== "string" ||
    !UUID_V4_RE.test(record.id)
  ) {
    errors.push("task.id must be a lowercase UUID v4");
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    errors.push("task.title must be a non-empty string");
  }
  if (normalizeTaskStatus(record.status as string) === null) {
    errors.push(
      "task.status must be one of " + TASK_STATUSES.join(", "),
    );
  }
  const createdAt = record.createdAt;
  const updatedAt = record.updatedAt;
  if (typeof createdAt !== "string" || !UTC_TIMESTAMP_RE.test(createdAt)) {
    errors.push("task.createdAt must be a UTC timestamp");
  }
  if (typeof updatedAt !== "string" || !UTC_TIMESTAMP_RE.test(updatedAt)) {
    errors.push("task.updatedAt must be a UTC timestamp");
  }
  if (
    typeof createdAt === "string" &&
    typeof updatedAt === "string" &&
    UTC_TIMESTAMP_RE.test(createdAt) &&
    UTC_TIMESTAMP_RE.test(updatedAt) &&
    updatedAt < createdAt
  ) {
    errors.push("task.updatedAt must not be earlier than task.createdAt");
  }
  if (isClosedTaskStatus(record.status as string)) {
    if (
      typeof record.closedAt !== "string" ||
      !UTC_TIMESTAMP_RE.test(record.closedAt)
    ) {
      errors.push("task.closedAt is required for completed/canceled tasks");
    } else if (
      typeof createdAt === "string" &&
      UTC_TIMESTAMP_RE.test(createdAt) &&
      record.closedAt < createdAt
    ) {
      errors.push("task.closedAt must not be earlier than task.createdAt");
    }
  } else if (record.closedAt !== undefined) {
    errors.push("task.closedAt must be absent for active tasks");
  }
  if (
    record.legacyId !== undefined &&
    (typeof record.legacyId !== "string" || record.legacyId.trim() === "")
  ) {
    errors.push("task.legacyId must be a non-empty string when present");
  }
  if (
    record.parentId !== undefined &&
    (typeof record.parentId !== "string" || record.parentId.trim() === "")
  ) {
    errors.push("task.parentId must be a non-empty string when present");
  }
  if (
    record.parentId !== undefined &&
    record.parentId === record.id
  ) {
    errors.push("task.parentId cannot point at the task itself");
  }
  if (record.labels !== undefined) {
    if (
      !Array.isArray(record.labels) ||
      record.labels.some(
        (label) => typeof label !== "string" || label.trim() === "",
      )
    ) {
      errors.push("task.labels must be an array of non-empty strings");
    } else if (new Set(record.labels).size !== record.labels.length) {
      errors.push("task.labels must not contain duplicates");
    }
  }
  if (
    record.nextAction !== undefined &&
    (typeof record.nextAction !== "string" ||
      record.nextAction.trim() === "")
  ) {
    errors.push("task.nextAction must be a non-empty string when present");
  }
  if (record.extensions !== undefined) {
    if (!isPlainObject(record.extensions)) {
      errors.push("task.extensions must be a JSON object");
    } else {
      for (const key of Object.keys(record.extensions)) {
        if (!EXTENSION_KEY_RE.test(key)) {
          errors.push(
            `task.extensions key ${JSON.stringify(key)} must be namespaced`,
          );
        }
      }
    }
  }
  return errors;
}

export function assertTaskRecordV1(record: unknown): void {
  const errors = validateTaskRecordV1(record);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

/**
 * Machine-readable view shared by list/show consumers. `version` is the
 * opaque token produced by the Python writer; Node code compares tokens but
 * never recomputes them.
 */
export interface VersionedTaskSnapshot {
  record: MemerigTaskRecord;
  version: string;
  closed: boolean;
  archived: boolean;
  archiveMonth?: string | null;
}

export function isVersionedTaskSnapshot(
  value: unknown,
): value is VersionedTaskSnapshot {
  return (
    isPlainObject(value) &&
    isPlainObject(value.record) &&
    typeof value.version === "string" &&
    typeof value.closed === "boolean" &&
    typeof value.archived === "boolean"
  );
}
