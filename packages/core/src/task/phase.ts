import type { MemerigTaskRecord } from "./schema.js";

/**
 * Coarse-grained MemeRig task phase derived from task status.
 *
 * Phase is a projection of {@link MemerigTaskRecord.status} only. There is
 * no separate `current_phase` field stored on disk — `inferTaskPhase`
 * exists so consumers can render the workflow phase without depending on
 * `.memerig/workflow.md` parsing.
 *
 * Mapping:
 *
 *   status              | phase
 *   --------------------|-----------
 *   planning            | plan
 *   in_progress         | implement
 *   review              | review
 *   completed | done    | completed
 *   <anything else>     | unknown
 */
export type MemerigTaskPhase =
  | "plan"
  | "implement"
  | "review"
  | "completed"
  | "unknown";

/**
 * Infer the phase of a task from either its parsed record or its raw
 * status string. Accepts a record so callers that already have one don't
 * need to re-pluck `status` first.
 */
export function inferTaskPhase(
  recordOrStatus: MemerigTaskRecord | string | null | undefined,
): MemerigTaskPhase {
  const status =
    typeof recordOrStatus === "string"
      ? recordOrStatus
      : recordOrStatus?.status;
  switch (status) {
    case "planning":
    case "open":
      return "plan";
    case "in_progress":
      return "implement";
    case "review":
      return "review";
    case "completed":
    case "done":
    case "archived":
    case "closed":
    case "canceled":
    case "cancelled":
      return "completed";
    default:
      return "unknown";
  }
}
