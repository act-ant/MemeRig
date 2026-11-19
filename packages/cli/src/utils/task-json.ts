/**
 * Canonical task.json shape — single source of truth shared by all TS
 * writers. The canonical types and factory now live in the
 * `memerig-core` task API; this module re-exports them under
 * the legacy `TaskJson` / `emptyTaskJson` names for CLI call sites.
 *
 * New code should prefer `MemerigTaskRecord` / `emptyTaskRecord` from
 * `memerig-core/task` directly.
 */

import {
  emptyTaskRecord,
  type MemerigTaskRecord,
} from "memerig-core/task";

export type TaskJson = MemerigTaskRecord;

export const emptyTaskJson = emptyTaskRecord;
