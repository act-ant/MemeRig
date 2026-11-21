// Public task API surface — canonical task record shape, factory,
// schema, I/O helpers, directory validation, and phase inference.
//
// Task API is intentionally independent from the channel API.

export type {
  MemerigTaskRecord,
  TaskRecordField,
  TaskRecordV1Field,
} from "./schema.js";

export {
  TASK_RECORD_FIELD_ORDER,
  TASK_RECORD_V1_FIELD_ORDER,
  emptyTaskRecord,
  taskRecordSchema,
} from "./schema.js";

export type {
  LoadTaskRecordOptions,
  WriteTaskRecordOptions,
} from "./records.js";

export {
  loadTaskRecord,
  writeTaskRecord,
} from "./records.js";

export type { TaskDirParts } from "./paths.js";
export { validateTaskDirName, isValidTaskDirName } from "./paths.js";

export type { MemerigTaskPhase } from "./phase.js";
export { inferTaskPhase } from "./phase.js";

export type {
  CanonicalTaskStatus,
  TaskLifecycleState,
  VersionedTaskSnapshot,
} from "./protocol.js";
export {
  TASK_STATUSES,
  assertTaskRecordV1,
  isActiveTaskStatus,
  isClosedTaskStatus,
  isVersionedTaskSnapshot,
  normalizeTaskStatus,
  taskLifecycleState,
  validateTaskRecordV1,
} from "./protocol.js";
