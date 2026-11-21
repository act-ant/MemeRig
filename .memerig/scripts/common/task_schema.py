"""
MemeRig task record schema (version 1).

Provides:
    new_task_record       — Build a complete v1 record for a new task
    coerce_task_record    — Upgrade a legacy/on-disk record to the v1 shape
    validate_record       — Structural + lifecycle validation for one record
    validate_hierarchy    — Cross-record id, parent and cycle validation
    task_json_schema      — Machine-readable JSON Schema for v1
    UTC helpers           — normalize_timestamp / utc_now / timestamp_from_mtime

Storage vocabulary is deliberately compatibility-first. The proposal used
``open`` / ``done``; MemeRig's existing breadcrumb and integration contract
consumes ``planning`` / ``in_progress`` / ``review`` / ``completed``. v1 keeps
the stored vocabulary and accepts the proposal names as aliases:

    open      -> planning
    done      -> completed
    archived  -> completed
    cancelled -> canceled

``completed`` and ``canceled`` are the closed states. Closing in place is a
status transition; it never moves the task directory. Legacy ``archive/``
directories remain readable and are part of the closed view.
"""

from __future__ import annotations

import copy
import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping

SCHEMA_VERSION = 1

STATUS_PLANNING = "planning"
STATUS_IN_PROGRESS = "in_progress"
STATUS_REVIEW = "review"
STATUS_COMPLETED = "completed"
STATUS_CANCELED = "canceled"

TASK_STATUSES: tuple[str, ...] = (
    STATUS_PLANNING,
    STATUS_IN_PROGRESS,
    STATUS_REVIEW,
    STATUS_COMPLETED,
    STATUS_CANCELED,
)
ACTIVE_STATUSES = frozenset(
    {STATUS_PLANNING, STATUS_IN_PROGRESS, STATUS_REVIEW}
)
CLOSED_STATUSES = frozenset({STATUS_COMPLETED, STATUS_CANCELED})
STATUS_ALIASES = {
    "open": STATUS_PLANNING,
    "done": STATUS_COMPLETED,
    "archived": STATUS_COMPLETED,
    "cancelled": STATUS_CANCELED,
    "closed": STATUS_COMPLETED,
}

# Transition table. A same-status update is always allowed (no transition).
# Reopening a closed task is explicit and clears closedAt/completedAt.
LEGAL_TRANSITIONS: dict[str, frozenset[str]] = {
    STATUS_PLANNING: frozenset(
        {STATUS_PLANNING, STATUS_IN_PROGRESS, STATUS_REVIEW, STATUS_COMPLETED, STATUS_CANCELED}
    ),
    STATUS_IN_PROGRESS: frozenset(
        {STATUS_IN_PROGRESS, STATUS_PLANNING, STATUS_REVIEW, STATUS_COMPLETED, STATUS_CANCELED}
    ),
    STATUS_REVIEW: frozenset(
        {STATUS_REVIEW, STATUS_PLANNING, STATUS_IN_PROGRESS, STATUS_COMPLETED, STATUS_CANCELED}
    ),
    STATUS_COMPLETED: frozenset(
        {STATUS_COMPLETED, STATUS_PLANNING, STATUS_IN_PROGRESS, STATUS_REVIEW}
    ),
    STATUS_CANCELED: frozenset(
        {STATUS_CANCELED, STATUS_PLANNING, STATUS_IN_PROGRESS, STATUS_REVIEW}
    ),
}

# All 24 legacy fields remain present on every normalized v1 record so the
# TypeScript MemerigTaskRecord shape and every existing reader keep working.
LEGACY_FIELD_ORDER: tuple[str, ...] = (
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
)

V1_FIELD_ORDER: tuple[str, ...] = (
    "schemaVersion",
    "updatedAt",
    "closedAt",
    "parentId",
    "legacyId",
    "labels",
    "nextAction",
    "extensions",
)

NULLABLE_STRING_FIELDS = (
    "dev_type",
    "scope",
    "package",
    "branch",
    "base_branch",
    "worktree_path",
    "commit",
    "pr_url",
    "parent",
)

STRING_LIST_FIELDS = ("subtasks", "children", "relatedFiles")

UUID4_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)
EXTENSION_KEY_RE = re.compile(r"^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$")
_ISO_UTC_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$"
)
_DATE_ONLY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DIR_DATE_PREFIX_RE = re.compile(r"^\d{2}-\d{2}-(.+)$")


class TaskSchemaError(ValueError):
    """Raised when a record cannot be coerced to the v1 shape."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = list(errors)
        super().__init__("; ".join(self.errors))


def is_uuid_task_id(value: object) -> bool:
    return isinstance(value, str) and UUID4_RE.match(value) is not None


def new_task_id() -> str:
    return str(uuid.uuid4())


def normalize_status(value: object) -> str | None:
    """Return the canonical stored status, or None when unrecognized."""
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    normalized = STATUS_ALIASES.get(normalized, normalized)
    return normalized if normalized in TASK_STATUSES else None


def is_closed_status(value: object) -> bool:
    normalized = normalize_status(value)
    return normalized in CLOSED_STATUSES


def is_active_status(value: object) -> bool:
    normalized = normalize_status(value)
    return normalized in ACTIVE_STATUSES


def slug_from_dir_name(dir_name: str) -> str:
    match = _DIR_DATE_PREFIX_RE.match(dir_name)
    return match.group(1) if match else dir_name


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


def timestamp_from_mtime(path: Path) -> str | None:
    try:
        stamp = path.stat().st_mtime
    except OSError:
        return None
    return datetime.fromtimestamp(stamp, tz=timezone.utc).replace(
        microsecond=0
    ).strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_timestamp(value: object) -> str | None:
    """Normalize a date-only or UTC ISO timestamp to ``YYYY-MM-DDTHH:MM:SSZ``."""
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    if _DATE_ONLY_RE.match(text):
        return f"{text}T00:00:00Z"
    candidate = text
    if candidate.endswith("Z"):
        candidate = candidate[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    parsed = parsed.astimezone(timezone.utc).replace(microsecond=0)
    return parsed.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_timestamp(value: object) -> datetime | None:
    normalized = normalize_timestamp(value)
    if normalized is None:
        return None
    return datetime.strptime(normalized, "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=timezone.utc
    )


def _string_or_none(record: dict, field: str, warnings: list[str]) -> None:
    value = record.get(field)
    if value is None:
        record[field] = None
        return
    if isinstance(value, str):
        record[field] = value.strip() or None
        return
    warnings.append(f"{field}: expected a string or null; reset to null")
    record[field] = None


def _string_list(record: dict, field: str, warnings: list[str]) -> None:
    value = record.get(field)
    if not isinstance(value, list):
        if value is not None:
            warnings.append(f"{field}: expected an array of strings; reset to []")
        record[field] = []
        return
    cleaned: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            cleaned.append(item.strip())
        else:
            warnings.append(f"{field}: dropped a non-string/empty entry")
    record[field] = cleaned


def _plain_dict(value: object) -> bool:
    return isinstance(value, dict)


def new_task_record(
    *,
    title: str,
    description: str = "",
    slug: str,
    status: str = STATUS_PLANNING,
    priority: str = "P2",
    creator: str = "",
    assignee: str = "",
    package: str | None = None,
    base_branch: str | None = None,
    branch: str | None = None,
    parent: str | None = None,
    parent_id: str | None = None,
    labels: Iterable[str] | None = None,
    next_action: str | None = None,
    meta: Mapping[str, Any] | None = None,
    extensions: Mapping[str, Any] | None = None,
    created_at: str | None = None,
) -> dict:
    """Build a complete v1 record. Caller owns the directory name/slug."""
    canonical_status = normalize_status(status)
    if canonical_status is None:
        raise TaskSchemaError([f"status: unknown value {status!r}"])
    created = normalize_timestamp(created_at) or utc_now()
    record: dict[str, Any] = {
        "id": new_task_id(),
        "name": slug,
        "title": title,
        "description": description,
        "status": canonical_status,
        "dev_type": None,
        "scope": None,
        "package": package,
        "priority": priority or "P2",
        "creator": creator,
        "assignee": assignee,
        "createdAt": created,
        "completedAt": None,
        "branch": branch,
        "base_branch": base_branch,
        "worktree_path": None,
        "commit": None,
        "pr_url": None,
        "subtasks": [],
        "children": [],
        "parent": parent,
        "relatedFiles": [],
        "notes": "",
        "meta": dict(meta or {}),
        "schemaVersion": SCHEMA_VERSION,
        "updatedAt": created,
    }
    if parent_id:
        record["parentId"] = parent_id
    if labels:
        record["labels"] = _dedupe_strings(labels)
    if next_action and next_action.strip():
        record["nextAction"] = next_action.strip()
    if extensions:
        record["extensions"] = copy.deepcopy(dict(extensions))
    return record


def _dedupe_strings(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        cleaned = value.strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        out.append(cleaned)
    return out


def coerce_task_record(
    data: Mapping[str, Any],
    *,
    dir_name: str,
    path: Path | None = None,
    now: str | None = None,
    assign_id: bool = True,
) -> tuple[dict, list[str]]:
    """Upgrade a legacy/partial on-disk record to the complete v1 shape.

    Preserves every recognized field and every unknown field. Raises
    ``TaskSchemaError`` when the status is unrecognized or required values
    cannot be normalized; migration preview reports those per record.
    """
    if not isinstance(data, Mapping):
        raise TaskSchemaError(["record: expected a JSON object"])

    warnings: list[str] = []
    record: dict[str, Any] = copy.deepcopy(dict(data))
    stamp = normalize_timestamp(now) or utc_now()

    original_id = record.get("id")
    if not isinstance(original_id, str) or not original_id.strip():
        raw_name = record.get("name")
        if isinstance(raw_name, str) and raw_name.strip():
            original_id = raw_name.strip()
        else:
            original_id = slug_from_dir_name(dir_name)
    original_id = str(original_id).strip()

    legacy_id: str | None = None
    raw_legacy_id = record.get("legacyId")
    if isinstance(raw_legacy_id, str) and raw_legacy_id.strip():
        legacy_id = raw_legacy_id.strip()
    elif raw_legacy_id is not None:
        warnings.append("legacyId: expected a string; reset")

    if is_uuid_task_id(record.get("id")):
        task_id = str(record["id"])
    elif assign_id:
        task_id = new_task_id()
        if original_id and original_id != task_id:
            # Keep the legacy handle resolvable (show/update by old id) even
            # after the canonical UUID becomes the record's identity.
            if legacy_id is None:
                legacy_id = original_id
    else:
        task_id = original_id

    name = record.get("name")
    if not isinstance(name, str) or not name.strip():
        name = slug_from_dir_name(dir_name)
    name = name.strip()

    title = record.get("title")
    if not isinstance(title, str) or not title.strip():
        title = name or dir_name
    description = record.get("description")
    if not isinstance(description, str):
        if description is not None:
            warnings.append("description: expected a string; reset to empty")
        description = ""

    raw_status = record.get("status", STATUS_PLANNING)
    status = normalize_status(raw_status)
    if status is None:
        raise TaskSchemaError(
            [f"status: unrecognized value {raw_status!r}; map it before migrating"]
        )

    mtime = timestamp_from_mtime(path) if path is not None else None
    created_at = normalize_timestamp(record.get("createdAt")) or mtime or stamp
    updated_at = normalize_timestamp(record.get("updatedAt")) or mtime or created_at

    record["id"] = task_id
    record["name"] = name
    record["title"] = title
    record["description"] = description
    record["status"] = status
    record["createdAt"] = created_at
    record["updatedAt"] = updated_at

    created_dt = parse_timestamp(created_at)
    updated_dt = parse_timestamp(updated_at)
    if created_dt is None or updated_dt is None:
        raise TaskSchemaError(
            ["createdAt/updatedAt: could not be normalized to UTC timestamps"]
        )

    if status in CLOSED_STATUSES:
        closed_source = (
            record.get("closedAt")
            or record.get("completedAt")
            or updated_at
        )
        closed_at = normalize_timestamp(closed_source) or updated_at
        record["closedAt"] = closed_at
        record["completedAt"] = closed_at
        closed_dt = parse_timestamp(closed_at)
        if closed_dt is None:
            raise TaskSchemaError(["closedAt: could not be normalized"])
        if closed_dt < created_dt:
            raise TaskSchemaError(
                ["closedAt: must not be earlier than createdAt"]
            )
    else:
        if record.get("closedAt") is not None:
            warnings.append("closedAt: removed from an active task")
        if record.get("completedAt") is not None:
            warnings.append("completedAt: cleared on an active task")
        record.pop("closedAt", None)
        record["completedAt"] = None

    if updated_dt < created_dt:
        raise TaskSchemaError(["updatedAt: must not be earlier than createdAt"])

    for field in NULLABLE_STRING_FIELDS:
        _string_or_none(record, field, warnings)
    for field in STRING_LIST_FIELDS:
        _string_list(record, field, warnings)

    for field in ("priority", "creator", "assignee", "notes"):
        value = record.get(field)
        if not isinstance(value, str):
            if value is not None:
                warnings.append(f"{field}: expected a string; reset")
            value = ""
        record[field] = value
    if not record["priority"].strip():
        record["priority"] = "P2"
    record["priority"] = record["priority"].strip()
    record["creator"] = record["creator"].strip()
    record["assignee"] = record["assignee"].strip()
    record["notes"] = record["notes"]

    meta = record.get("meta")
    if not _plain_dict(meta):
        if meta is not None:
            warnings.append("meta: expected an object; reset to {}")
        meta = {}
    record["meta"] = copy.deepcopy(meta)

    labels = record.get("labels")
    if labels is not None:
        if not isinstance(labels, list):
            warnings.append("labels: expected an array; dropped")
            record.pop("labels", None)
        else:
            cleaned = _dedupe_strings(labels)
            if cleaned:
                record["labels"] = cleaned
            else:
                record.pop("labels", None)

    next_action = record.get("nextAction")
    if next_action is not None:
        if not isinstance(next_action, str):
            warnings.append("nextAction: expected a string; dropped")
            record.pop("nextAction", None)
        elif next_action.strip():
            record["nextAction"] = next_action.strip()
        else:
            record.pop("nextAction", None)

    extensions = record.get("extensions")
    if extensions is not None:
        if not _plain_dict(extensions):
            warnings.append("extensions: expected an object; dropped")
            record.pop("extensions", None)
        else:
            kept: dict[str, Any] = {}
            for key, value in extensions.items():
                if EXTENSION_KEY_RE.match(str(key)):
                    kept[str(key)] = value
                else:
                    warnings.append(
                        f"extensions: dropped key {key!r}; expected "
                        "a namespaced key like com.example.board"
                    )
            if kept:
                record["extensions"] = kept
            else:
                record.pop("extensions", None)

    if legacy_id:
        record["legacyId"] = legacy_id
    else:
        record.pop("legacyId", None)

    parent_id = record.get("parentId")
    if parent_id is not None:
        if not isinstance(parent_id, str) or not parent_id.strip():
            warnings.append("parentId: expected a non-empty string; dropped")
            record.pop("parentId", None)
        else:
            record["parentId"] = parent_id.strip()

    record["schemaVersion"] = SCHEMA_VERSION
    record["subtasks"] = list(record.get("subtasks") or [])
    record["children"] = list(record.get("children") or [])
    record["relatedFiles"] = list(record.get("relatedFiles") or [])

    return _ordered_record(record), warnings


def _ordered_record(record: Mapping[str, Any]) -> dict:
    """Legacy 24 fields first, v1 additive fields next, unknown fields last."""
    ordered: dict[str, Any] = {}
    for field in LEGACY_FIELD_ORDER:
        ordered[field] = copy.deepcopy(record.get(field))
    for field in V1_FIELD_ORDER:
        if field in record and record[field] is not None:
            ordered[field] = copy.deepcopy(record[field])
    for key, value in record.items():
        if key not in ordered:
            ordered[key] = copy.deepcopy(value)
    return ordered


def validate_record(
    record: Mapping[str, Any],
    *,
    known_ids: Mapping[str, Any] | None = None,
) -> list[str]:
    """Return structural/lifecycle errors for one normalized v1 record."""
    errors: list[str] = []
    if not isinstance(record, Mapping):
        return ["record: expected a JSON object"]

    if record.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(f"schemaVersion: must be {SCHEMA_VERSION}")

    task_id = record.get("id")
    if not is_uuid_task_id(task_id):
        errors.append("id: must be a lowercase UUID v4")

    legacy_id = record.get("legacyId")
    if legacy_id is not None and (
        not isinstance(legacy_id, str) or not legacy_id.strip()
    ):
        errors.append("legacyId: must be a non-empty string when present")

    title = record.get("title")
    if not isinstance(title, str) or not title.strip():
        errors.append("title: must be a non-empty string")

    status = normalize_status(record.get("status"))
    if status is None:
        errors.append("status: must be one of " + ", ".join(TASK_STATUSES))

    for field in ("createdAt", "updatedAt"):
        if parse_timestamp(record.get(field)) is None:
            errors.append(f"{field}: must be a UTC timestamp")
    created = parse_timestamp(record.get("createdAt"))
    updated = parse_timestamp(record.get("updatedAt"))
    if created and updated and updated < created:
        errors.append("updatedAt: must not be earlier than createdAt")

    closed_at = record.get("closedAt")
    if status in CLOSED_STATUSES:
        parsed_closed = parse_timestamp(closed_at)
        if parsed_closed is None:
            errors.append("closedAt: required for completed/canceled tasks")
        elif created and parsed_closed < created:
            errors.append("closedAt: must not be earlier than createdAt")
    elif closed_at is not None:
        errors.append("closedAt: must be absent for active tasks")

    for field in NULLABLE_STRING_FIELDS:
        value = record.get(field)
        if value is not None and not isinstance(value, str):
            errors.append(f"{field}: must be a string or null")
    for field in STRING_LIST_FIELDS:
        value = record.get(field)
        if not isinstance(value, list) or any(
            not isinstance(item, str) for item in value
        ):
            errors.append(f"{field}: must be an array of strings")
    for field in ("priority", "creator", "assignee", "notes"):
        if not isinstance(record.get(field), str):
            errors.append(f"{field}: must be a string")
    if not isinstance(record.get("meta"), dict):
        errors.append("meta: must be a JSON object")

    labels = record.get("labels")
    if labels is not None:
        if not isinstance(labels, list) or any(
            not isinstance(item, str) or not item.strip() for item in labels
        ):
            errors.append("labels: must be an array of non-empty strings")
        elif len(set(labels)) != len(labels):
            errors.append("labels: must not contain duplicates")

    next_action = record.get("nextAction")
    if next_action is not None and (
        not isinstance(next_action, str) or not next_action.strip()
    ):
        errors.append("nextAction: must be a non-empty string when present")

    extensions = record.get("extensions")
    if extensions is not None:
        if not isinstance(extensions, dict):
            errors.append("extensions: must be a JSON object")
        else:
            for key in extensions:
                if not EXTENSION_KEY_RE.match(str(key)):
                    errors.append(
                        f"extensions: key {key!r} must be namespaced "
                        "(e.g. com.example.board)"
                    )

    parent_id = record.get("parentId")
    if parent_id is not None:
        if not isinstance(parent_id, str) or not parent_id.strip():
            errors.append("parentId: must be a non-empty string when present")
        elif known_ids is not None:
            if parent_id == task_id:
                errors.append("parentId: a task cannot be its own parent")
            elif parent_id not in known_ids:
                errors.append(f"parentId: unknown parent task {parent_id}")

    return errors


def validate_hierarchy(
    records: Iterable[Mapping[str, Any]],
) -> tuple[list[str], list[str]]:
    """Validate ids and parent edges across a task store.

    Returns ``(errors, warnings)``. Only errors block migration/apply;
    warnings cover dangling legacy references that the runtime already
    tolerates.
    """
    errors: list[str] = []
    warnings: list[str] = []
    by_id: dict[str, Mapping[str, Any]] = {}
    by_legacy: dict[str, list[Mapping[str, Any]]] = {}
    for record in records:
        task_id = record.get("id")
        if isinstance(task_id, str):
            if task_id in by_id:
                errors.append(f"duplicate task id: {task_id}")
            else:
                by_id[task_id] = record
        legacy = record.get("legacyId")
        if isinstance(legacy, str) and legacy:
            by_legacy.setdefault(legacy, []).append(record)

    for legacy, matches in by_legacy.items():
        if len(matches) > 1:
            warnings.append(
                f"legacy id {legacy!r} is shared by {len(matches)} tasks; "
                "new UUIDs disambiguate them, but old external references "
                "resolve to the first match"
            )
        if legacy in by_id:
            warnings.append(
                f"legacy id {legacy!r} is also another task's current id"
            )

    for record in records:
        task_id = record.get("id")
        parent_id = record.get("parentId")
        if parent_id is None:
            continue
        if parent_id == task_id:
            errors.append(f"{task_id}: parentId points at itself")
            continue
        if parent_id not in by_id:
            warnings.append(
                f"{task_id}: parentId {parent_id!r} does not resolve "
                "(dangling parent preserved as legacy `parent`)"
            )

    # Cycle detection over parentId edges.
    for task_id in by_id:
        seen: list[str] = []
        cursor: str | None = task_id
        while cursor and cursor in by_id:
            if cursor in seen:
                errors.append(
                    "parent cycle: " + " -> ".join(seen + [cursor])
                )
                break
            seen.append(cursor)
            cursor = by_id[cursor].get("parentId")

    return errors, warnings


def task_json_schema() -> dict:
    """Return the v1 JSON Schema implemented by this module."""
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://memerig.dev/schema/task-v1.json",
        "title": "MemeRig task record v1",
        "description": (
            "Compatibility-first v1. Stored status vocabulary keeps "
            "planning/in_progress/review/completed/canceled so the per-turn "
            "workflow breadcrumb and existing integrations keep working; "
            "open/done are accepted aliases. The 24 legacy task.json fields "
            "remain required so memerig-core's MemerigTaskRecord stays valid. "
            "Closing in place writes closedAt and completedAt; archived tasks "
            "remain readable in the closed view."
        ),
        "type": "object",
        "required": [
            "schemaVersion",
            "id",
            "name",
            "title",
            "description",
            "status",
            "priority",
            "creator",
            "assignee",
            "createdAt",
            "updatedAt",
            "subtasks",
            "children",
            "parent",
            "relatedFiles",
            "notes",
            "meta",
        ],
        "properties": {
            "schemaVersion": {"const": SCHEMA_VERSION},
            "id": {
                "type": "string",
                "pattern": UUID4_RE.pattern,
                "description": "Immutable UUID v4 identity for new records.",
            },
            "legacyId": {
                "type": "string",
                "minLength": 1,
                "description": "Pre-migration id/slug, kept resolvable.",
            },
            "name": {"type": "string", "minLength": 1},
            "title": {"type": "string", "minLength": 1, "pattern": "\\S"},
            "description": {"type": "string"},
            "status": {
                "enum": list(TASK_STATUSES),
                "description": "Canonical stored state; open/done accepted on input.",
            },
            "createdAt": {"type": "string", "format": "date-time"},
            "updatedAt": {"type": "string", "format": "date-time"},
            "closedAt": {"type": "string", "format": "date-time"},
            "completedAt": {
                "type": ["string", "null"],
                "description": "Legacy close timestamp, mirrored from closedAt.",
            },
            "parent": {
                "type": ["string", "null"],
                "description": "Legacy parent directory-name mirror.",
            },
            "parentId": {
                "type": "string",
                "description": "Canonical parent UUID edge.",
            },
            "assignee": {
                "type": "string",
                "description": "Project-recognized handle; empty means unassigned.",
            },
            "creator": {"type": "string"},
            "priority": {"type": "string", "minLength": 1},
            "labels": {
                "type": "array",
                "uniqueItems": True,
                "items": {"type": "string", "minLength": 1, "pattern": "\\S"},
            },
            "nextAction": {"type": "string", "minLength": 1, "pattern": "\\S"},
            "extensions": {
                "type": "object",
                "propertyNames": {
                    "pattern": "^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)+$"
                },
                "description": "Namespaced adapter metadata; preserve other keys.",
            },
            "meta": {
                "type": "object",
                "description": "Legacy free-form metadata bag retained verbatim.",
            },
        },
        "allOf": [
            {
                "if": {
                    "properties": {
                        "status": {"enum": list(CLOSED_STATUSES)}
                    },
                    "required": ["status"],
                },
                "then": {"required": ["closedAt"]},
            }
        ],
        "examples": [
            {
                "schemaVersion": SCHEMA_VERSION,
                "id": "7be9eba6-7463-46b0-87b7-8d9b9a067b9a",
                "name": "verify-clean-clone",
                "title": "Verify a clean clone can resume a task",
                "description": "Protocol smoke test",
                "status": STATUS_IN_PROGRESS,
                "createdAt": "2026-11-19T09:00:00Z",
                "updatedAt": "2026-11-19T10:30:00Z",
                "nextAction": "Run task.py list in an empty user directory",
            }
        ],
    }


def dumps_record(record: Mapping[str, Any]) -> str:
    return json.dumps(record, indent=2, ensure_ascii=False)
