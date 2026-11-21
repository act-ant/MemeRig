/**
 * Canonical task.json shape — single source of truth for MemeRig tasks.
 *
 * The runtime Python writer is `.memerig/scripts/common/task_store.py`
 * (`cmd_create`). The 24-field shape and field order below mirror that
 * writer exactly so every TS and Python entry point produces structurally
 * identical task.json files.
 *
 * Downstream consumers (CLI bootstrap, migration tooling, external Node
 * services) should depend on this type instead of redefining their own
 * task.json shape.
 */
export interface MemerigTaskRecord {
  id: string;
  name: string;
  title: string;
  description: string;
  status: string;
  dev_type: string | null;
  scope: string | null;
  package: string | null;
  priority: string;
  creator: string;
  assignee: string;
  createdAt: string;
  completedAt: string | null;
  branch: string | null;
  base_branch: string | null;
  worktree_path: string | null;
  commit: string | null;
  pr_url: string | null;
  subtasks: string[];
  children: string[];
  parent: string | null;
  relatedFiles: string[];
  notes: string;
  meta: Record<string, unknown>;
  // Schema v1 additive fields. Optional so legacy records and the 24-field
  // canonical factory keep loading/writing unchanged.
  schemaVersion?: number;
  updatedAt?: string;
  closedAt?: string;
  parentId?: string;
  legacyId?: string;
  labels?: string[];
  nextAction?: string;
  extensions?: Record<string, unknown>;
}

/**
 * Canonical task field order — matches `task_store.py::cmd_create`. Used
 * by `writeTaskRecord` so the on-disk JSON layout is deterministic.
 */
export const TASK_RECORD_FIELD_ORDER = [
  "id",
  "name",
  "title",
  "description",
  "status",
  "dev_type",
  "scope",
  "package",
  "priority",
  "creator",
  "assignee",
  "createdAt",
  "completedAt",
  "branch",
  "base_branch",
  "worktree_path",
  "commit",
  "pr_url",
  "subtasks",
  "children",
  "parent",
  "relatedFiles",
  "notes",
  "meta",
] as const satisfies readonly (keyof MemerigTaskRecord)[];

export type TaskRecordField = (typeof TASK_RECORD_FIELD_ORDER)[number];

/**
 * Additive v1 fields, written after the canonical 24 legacy fields. Kept out
 * of {@link TASK_RECORD_FIELD_ORDER} so existing 24-field fixtures and
 * readers that assume that exact shape keep working.
 */
export const TASK_RECORD_V1_FIELD_ORDER = [
  "schemaVersion",
  "updatedAt",
  "closedAt",
  "parentId",
  "legacyId",
  "labels",
  "nextAction",
  "extensions",
] as const satisfies readonly (keyof MemerigTaskRecord)[];

export type TaskRecordV1Field =
  (typeof TASK_RECORD_V1_FIELD_ORDER)[number];

const STRING_FIELDS: ReadonlySet<TaskRecordField> = new Set([
  "id",
  "name",
  "title",
  "description",
  "status",
  "priority",
  "creator",
  "assignee",
  "createdAt",
  "notes",
]);

const NULLABLE_STRING_FIELDS: ReadonlySet<TaskRecordField> = new Set([
  "dev_type",
  "scope",
  "package",
  "completedAt",
  "branch",
  "base_branch",
  "worktree_path",
  "commit",
  "pr_url",
  "parent",
]);

const STRING_ARRAY_FIELDS: ReadonlySet<TaskRecordField> = new Set([
  "subtasks",
  "children",
  "relatedFiles",
]);

const EXTENSION_KEY_RE =
  /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

/**
 * Lightweight runtime schema for {@link MemerigTaskRecord}. Zero-dep on
 * purpose — `taskRecordSchema.parse(input)` returns a canonicalized
 * record, throwing on shape violations; `taskRecordSchema.safeParse`
 * returns a result discriminated by `success`.
 *
 * All canonical fields are required; older partial records are rejected rather
 * than backfilled with defaults. Unknown fields on the input are intentionally
 * omitted from this structured output. `writeTaskRecord` preserves unknown
 * fields already present on disk by merging canonical updates over the existing
 * JSON object.
 */
export const taskRecordSchema = {
  parse(input: unknown): MemerigTaskRecord {
    return parseTaskRecord(input);
  },
  safeParse(
    input: unknown,
  ):
    | { success: true; data: MemerigTaskRecord }
    | { success: false; error: Error } {
    try {
      return { success: true, data: parseTaskRecord(input) };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  },
} as const;

function parseTaskRecord(input: unknown): MemerigTaskRecord {
  if (!isPlainObject(input)) {
    throw new Error("task record must be a JSON object");
  }
  const out = emptyTaskRecord();
  for (const field of TASK_RECORD_FIELD_ORDER) {
    if (!(field in input)) {
      throw new Error(`task.${field} is required`);
    }
    const value = (input as Record<string, unknown>)[field];
    assignField(out, field, value);
  }
  for (const field of TASK_RECORD_V1_FIELD_ORDER) {
    const value = (input as Record<string, unknown>)[field];
    if (value !== undefined) {
      assignV1Field(out, field, value);
    }
  }
  return out;
}

function assignV1Field(
  record: MemerigTaskRecord,
  field: TaskRecordV1Field,
  value: unknown,
): void {
  const bag = record as unknown as Record<string, unknown>;
  if (field === "schemaVersion") {
    if (value !== 1) {
      throw new Error("task.schemaVersion must be 1");
    }
    bag[field] = 1;
    return;
  }
  if (field === "labels") {
    if (
      !Array.isArray(value) ||
      value.some((item) => typeof item !== "string" || item.trim() === "")
    ) {
      throw new Error("task.labels must be an array of non-empty strings");
    }
    if (new Set(value).size !== value.length) {
      throw new Error("task.labels must not contain duplicates");
    }
    bag[field] = [...value];
    return;
  }
  if (field === "extensions") {
    if (!isPlainObject(value)) {
      throw new Error("task.extensions must be a JSON object");
    }
    for (const key of Object.keys(value)) {
      if (!EXTENSION_KEY_RE.test(key)) {
        throw new Error(
          `task.extensions key ${JSON.stringify(key)} must be namespaced (e.g. com.example.board)`,
        );
      }
    }
    bag[field] = cloneJsonObject(value, "task.extensions");
    return;
  }
  if (typeof value !== "string") {
    throw new Error(`task.${field} must be a string`);
  }
  if (field === "nextAction" && value.trim() === "") {
    throw new Error("task.nextAction must be a non-empty string");
  }
  bag[field] = value;
}

function assignField(
  record: MemerigTaskRecord,
  field: TaskRecordField,
  value: unknown,
): void {
  const bag = record as unknown as Record<string, unknown>;
  if (STRING_FIELDS.has(field)) {
    if (typeof value !== "string") {
      throw new Error(`task.${field} must be a string`);
    }
    bag[field] = value;
    return;
  }
  if (NULLABLE_STRING_FIELDS.has(field)) {
    if (value !== null && typeof value !== "string") {
      throw new Error(`task.${field} must be a string or null`);
    }
    bag[field] = value;
    return;
  }
  if (STRING_ARRAY_FIELDS.has(field)) {
    if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
      throw new Error(`task.${field} must be an array of strings`);
    }
    bag[field] = [...value];
    return;
  }
  if (field === "meta") {
    if (!isPlainObject(value)) {
      throw new Error("task.meta must be a JSON object");
    }
    record.meta = cloneJsonObject(value, "task.meta");
    return;
  }
  // Should be unreachable given the field sets cover every canonical field.
  /* c8 ignore next */
  throw new Error(`unknown canonical task field: ${field}`);
}

/**
 * Produce a fully-populated canonical-shape {@link MemerigTaskRecord}.
 *
 * All 24 fields are present in canonical order. `overrides` shallow-merges
 * over the defaults — callers supply per-task values (id, name, title,
 * assignee, createdAt, etc.) and leave null-default fields untouched
 * unless they have a real value.
 */
export function emptyTaskRecord(
  overrides: Partial<MemerigTaskRecord> = {},
): MemerigTaskRecord {
  const today = new Date().toISOString().split("T")[0] ?? "";
  const base: MemerigTaskRecord = {
    id: "",
    name: "",
    title: "",
    description: "",
    status: "planning",
    dev_type: null,
    scope: null,
    package: null,
    priority: "P2",
    creator: "",
    assignee: "",
    createdAt: today,
    completedAt: null,
    branch: null,
    base_branch: null,
    worktree_path: null,
    commit: null,
    pr_url: null,
    subtasks: [],
    children: [],
    parent: null,
    relatedFiles: [],
    notes: "",
    meta: {},
  };
  const record = { ...base, ...overrides };
  if (overrides.subtasks !== undefined) {
    record.subtasks = [...overrides.subtasks];
  }
  if (overrides.children !== undefined) {
    record.children = [...overrides.children];
  }
  if (overrides.relatedFiles !== undefined) {
    record.relatedFiles = [...overrides.relatedFiles];
  }
  if (overrides.meta !== undefined) {
    record.meta = cloneJsonObject(overrides.meta, "task.meta");
  }
  return record;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function cloneJsonObject(
  value: Record<string, unknown>,
  path: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = cloneJsonValue(child, `${path}.${key}`);
  }
  return out;
}

function cloneJsonValue(value: unknown, path: string): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${path} must be a finite JSON number`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => cloneJsonValue(item, `${path}[${index}]`));
  }
  if (isPlainObject(value)) {
    return cloneJsonObject(value, path);
  }
  throw new Error(`${path} must contain only JSON values`);
}
