"""
Versioned task protocol (v1) for repository-native collaboration.

Provides:
    TaskLocation / scan_task_locations — find active and legacy archived tasks
    find_task_location                 — resolve id / legacy id / dir / path
    create_task_record                 — create under one writer lock
    update_task_record                 — stale-checked read-modify-write
    complete_task_record               — idempotent in-place close
    list_task_views                     — active / closed views
    cmd_show / cmd_update / cmd_complete / cmd_schema / cmd_list_closed

Concurrency boundary: every mutation acquires the single advisory lock at
``.memerig/tasks/.task.lock``. The version token is the SHA-256 of the exact
``task.json`` bytes read from disk. A caller that supplies the token it last
saw gets ``StaleVersionError`` if any writer replaced the file in between.
Writes use ``write_text_atomic`` (same-directory temp + ``os.replace``), so a
crash never truncates the record. ``complete`` is the exception to strict
stale checking: closing an already-closed task is a no-op that returns the
current record even if the caller's token is old, which makes retries safe.

Machine-readable responses are JSON on stdout; diagnostics go to stderr.
Human callers keep the existing task.py behavior.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping

from .active_task import clear_task_from_sessions
from .file_lock import file_lock
from .io import (
    JSON_READ_EMPTY,
    JSON_READ_INVALID,
    JSON_READ_MISSING,
    JSON_READ_NOT_OBJECT,
    JSON_READ_UNDECODABLE,
    JSON_READ_UNREADABLE,
    describe_json_read_failure,
    write_text_atomic,
)
from .log import Colors, colored
from .paths import DIR_ARCHIVE, DIR_TASKS, DIR_WORKFLOW, FILE_TASK_JSON, get_repo_root
from .task_utils import run_task_hooks
from .task_schema import (
    ACTIVE_STATUSES,
    CLOSED_STATUSES,
    LEGAL_TRANSITIONS,
    STATUS_CANCELED,
    STATUS_COMPLETED,
    TaskSchemaError,
    coerce_task_record,
    dumps_record,
    is_closed_status,
    is_uuid_task_id,
    normalize_status,
    normalize_timestamp,
    task_json_schema,
    utc_now,
    validate_record,
)

TASK_LOCK_NAME = ".task.lock"

_UNSET = object()


class TaskProtocolError(Exception):
    """Base error with a stable machine-readable code."""

    code = "task_error"

    def __init__(self, message: str, *, details: Mapping[str, Any] | None = None) -> None:
        self.details = dict(details or {})
        super().__init__(message)


class TaskNotFoundError(TaskProtocolError):
    code = "task_not_found"


class AmbiguousTaskError(TaskProtocolError):
    code = "task_ambiguous"


class TaskExistsError(TaskProtocolError):
    code = "task_exists"


class TaskArchivedError(TaskProtocolError):
    code = "task_archived"


class ParentNotFoundError(TaskProtocolError):
    code = "parent_not_found"


class StaleVersionError(TaskProtocolError):
    code = "stale_version"

    def __init__(
        self,
        message: str,
        *,
        current_version: str,
        current_record: Mapping[str, Any] | None = None,
    ) -> None:
        self.current_version = current_version
        self.current_record = dict(current_record or {})
        super().__init__(
            message,
            details={
                "currentVersion": current_version,
                "current": self.current_record,
            },
        )


class TaskValidationError(TaskProtocolError):
    code = "task_invalid"

    def __init__(self, errors: Iterable[str]) -> None:
        self.errors = list(errors)
        super().__init__("task record is invalid", details={"errors": self.errors})


class TaskWriteError(TaskProtocolError):
    code = "task_write_failed"


@dataclass(frozen=True)
class TaskLocation:
    directory: Path
    relative_path: str
    archived: bool
    archive_month: str | None
    data: dict
    raw: bytes
    token: str

    @property
    def task_json(self) -> Path:
        return self.directory / FILE_TASK_JSON

    @property
    def dir_name(self) -> str:
        return self.directory.name

    @property
    def closed(self) -> bool:
        # Legacy archive paths are the closed view even if a hand-edited
        # record lost its completed status.
        return self.archived or is_closed_status(self.data.get("status"))

    @property
    def status(self) -> str:
        return normalize_status(self.data.get("status")) or "unknown"

    @property
    def task_id(self) -> str:
        value = self.data.get("id")
        return value if isinstance(value, str) and value else self.dir_name


@dataclass
class ScanResult:
    locations: list[TaskLocation]
    problems: list[dict]

    def active(self) -> list[TaskLocation]:
        return [loc for loc in self.locations if not loc.archived]

    def closed(self) -> list[TaskLocation]:
        return [loc for loc in self.locations if loc.closed]


# =============================================================================
# Roots and paths
# =============================================================================


class ProjectResolutionError(TaskProtocolError):
    code = "project_error"


def resolve_owner(start: Path | None = None) -> Path:
    """Resolve the owning project root for a task command.

    Uses ``common.project.resolve_project(start).owner`` when the project
    resolver is installed. ``ProjectConfigNotFound`` is the only failure that
    falls back to the legacy ``.memerig`` walk: a legacy checkout without the
    config file has no ownership declaration, so its nearest ``.memerig`` is
    the store. Any other ValueError (for example ``task_owner: parent`` with no
    parent config) is a real ownership error and must not silently write into
    the wrong store.
    """
    base = (start or Path.cwd()).resolve()
    try:
        from . import project as project_module
    except ImportError:
        return get_repo_root(base)
    resolve_project = getattr(project_module, "resolve_project", None)
    if resolve_project is None:
        return get_repo_root(base)
    no_config_cls = getattr(project_module, "ProjectConfigNotFound", None)
    try:
        project = resolve_project(base)
    except Exception as exc:
        if no_config_cls is not None and isinstance(exc, no_config_cls):
            return get_repo_root(base)
        raise ProjectResolutionError(
            f"could not resolve the owning project: {exc}",
            details={"start": str(base), "error": str(exc)},
        ) from exc
    owner = getattr(project, "owner", None)
    if owner is None:
        raise ProjectResolutionError(
            "project resolver returned no owner",
            details={"start": str(base)},
        )
    return Path(owner).resolve()


def tasks_root_for(owner: Path) -> Path:
    return owner / DIR_WORKFLOW / DIR_TASKS


def lock_path_for(tasks_root: Path) -> Path:
    return tasks_root / TASK_LOCK_NAME


def _relative_to(path: Path, base: Path) -> str:
    try:
        return path.relative_to(base).as_posix()
    except ValueError:
        return str(path)


def _is_within(path: Path, base: Path) -> bool:
    try:
        path.relative_to(base)
        return True
    except ValueError:
        return False


# =============================================================================
# Reading and scanning
# =============================================================================


def _read_raw_record(path: Path) -> tuple[dict | None, bytes | None, str | None]:
    try:
        raw = path.read_bytes()
    except FileNotFoundError:
        return None, None, JSON_READ_MISSING
    except OSError:
        return None, None, JSON_READ_UNREADABLE
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return None, raw, JSON_READ_UNDECODABLE
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None, raw, JSON_READ_INVALID
    if not isinstance(data, dict):
        return None, raw, JSON_READ_NOT_OBJECT
    if not data:
        return None, raw, JSON_READ_EMPTY
    return data, raw, None


def token_for(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def record_bytes(record: Mapping[str, Any]) -> bytes:
    return dumps_record(record).encode("utf-8")


def _read_location(
    directory: Path,
    owner: Path,
    *,
    archived: bool,
    archive_month: str | None,
    problems: list[dict] | None = None,
) -> TaskLocation | None:
    task_json = directory / FILE_TASK_JSON
    data, raw, reason = _read_raw_record(task_json)
    if data is None or raw is None:
        if problems is not None and task_json.is_file():
            problem, hint = describe_json_read_failure(task_json, reason)
            problems.append(
                {
                    "path": _relative_to(directory, owner),
                    "reason": reason,
                    "message": f"{problem}. {hint}",
                }
            )
        return None
    return TaskLocation(
        directory=directory,
        relative_path=_relative_to(directory, owner),
        archived=archived,
        archive_month=archive_month,
        data=data,
        raw=raw,
        token=token_for(raw),
    )


def _iter_task_dirs(tasks_root: Path) -> Iterable[tuple[Path, bool, str | None]]:
    if not tasks_root.is_dir():
        return
    tasks_real = tasks_root.resolve()
    for child in sorted(tasks_root.iterdir()):
        if child.name == DIR_ARCHIVE or child.name.startswith("."):
            continue
        if not child.is_dir():
            continue
        try:
            child_real = child.resolve()
        except OSError:
            continue
        if not _is_within(child_real, tasks_real):
            continue
        yield child, False, None

    archive_root = tasks_root / DIR_ARCHIVE
    if not archive_root.is_dir():
        return
    archive_real = archive_root.resolve()
    for month_dir in sorted(archive_root.iterdir()):
        if not month_dir.is_dir() or month_dir.name.startswith("."):
            continue
        try:
            month_real = month_dir.resolve()
        except OSError:
            continue
        if not _is_within(month_real, archive_real):
            continue
        # Some legacy layouts put the task directly under archive/. Treat a
        # directory containing task.json as a task, not as a month bucket.
        if (month_dir / FILE_TASK_JSON).is_file():
            yield month_dir, True, None
            continue
        # Standard layout: archive/YYYY-MM/<task>.
        for child in sorted(month_dir.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            try:
                child_real = child.resolve()
            except OSError:
                continue
            if _is_within(child_real, archive_real):
                yield child, True, month_dir.name


def scan_task_locations(
    tasks_root: Path,
    owner: Path,
    *,
    include_archive: bool = True,
) -> ScanResult:
    locations: list[TaskLocation] = []
    problems: list[dict] = []
    for directory, archived, month in _iter_task_dirs(tasks_root):
        if archived and not include_archive:
            continue
        location = _read_location(
            directory,
            owner,
            archived=archived,
            archive_month=month,
            problems=problems,
        )
        if location is not None:
            locations.append(location)
    return ScanResult(locations=locations, problems=problems)


def _find_archived_dir(tasks_root: Path, dir_name: str) -> Path | None:
    archive_root = tasks_root / DIR_ARCHIVE
    if not archive_root.is_dir():
        return None
    for month_dir in sorted(archive_root.iterdir()):
        if not month_dir.is_dir():
            continue
        candidate = month_dir / dir_name
        if candidate.is_dir():
            return candidate
    return None


# =============================================================================
# Selection
# =============================================================================


def _path_candidates(owner: Path, selector: str) -> list[Path]:
    path = Path(selector)
    if path.is_absolute():
        return [path]
    normalized = selector.replace("\\", "/")
    candidates = [owner / path]
    if not (
        normalized.startswith(f"{DIR_WORKFLOW}/")
        or normalized.startswith(f"{DIR_TASKS}/")
    ):
        candidates.append(owner / DIR_WORKFLOW / DIR_TASKS / path)
    return candidates


def _select_location(
    scan: ScanResult,
    selector: str,
    owner: Path,
) -> TaskLocation:
    needle = selector.strip()
    if not needle:
        raise TaskNotFoundError("task selector is empty")

    looks_like_path = (
        "/" in needle
        or "\\" in needle
        or needle.startswith(".")
        or needle == ".."
    )
    if looks_like_path:
        resolved_candidates: list[Path] = []
        for candidate in _path_candidates(owner, needle):
            try:
                resolved_candidates.append(candidate.resolve())
            except OSError:
                continue
        for location in scan.locations:
            try:
                directory = location.directory.resolve()
            except OSError:
                continue
            if directory in resolved_candidates:
                return location
        raise TaskNotFoundError(
            f"no task found at path {needle!r}",
            details={"selector": needle},
        )

    exact: list[TaskLocation] = []
    for location in scan.locations:
        data = location.data
        if needle in {
            data.get("id"),
            data.get("legacyId"),
            data.get("name"),
            location.dir_name,
        }:
            exact.append(location)
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        raise AmbiguousTaskError(
            f"task selector {needle!r} matches {len(exact)} tasks",
            details={
                "selector": needle,
                "matches": [
                    {
                        "dir": location.relative_path,
                        "id": location.data.get("id"),
                        "archived": location.archived,
                    }
                    for location in exact
                ],
            },
        )

    raise TaskNotFoundError(
        f"no task found for {needle!r}",
        details={
            "selector": needle,
            "hint": (
                "Pass a task UUID, legacy id, directory name, or task path; "
                "`task.py list --closed` includes archived tasks."
            ),
        },
    )


def find_task_location(
    owner: Path,
    selector: str,
    *,
    include_archive: bool = True,
) -> TaskLocation:
    tasks_root = tasks_root_for(owner)
    scan = scan_task_locations(tasks_root, owner, include_archive=include_archive)
    return _select_location(scan, selector, owner)


# =============================================================================
# Writing
# =============================================================================


def write_record_file(directory: Path, record: Mapping[str, Any]) -> tuple[dict, str]:
    errors = validate_record(record)
    if errors:
        raise TaskValidationError(errors)
    text = dumps_record(record)
    task_json = directory / FILE_TASK_JSON
    if not write_text_atomic(task_json, text):
        raise TaskWriteError(
            f"failed to write {task_json}",
            details={"path": str(task_json)},
        )
    # Read back: text-mode writes can translate newlines on Windows, so the
    # token must hash the bytes that are actually on disk. A caller comparing
    # this token against a later read must see the same value.
    try:
        raw = task_json.read_bytes()
    except OSError:
        raw = text.encode("utf-8")
    return dict(record), token_for(raw)


def _write_mirror(path: Path, data: Mapping[str, Any]) -> None:
    text = dumps_record(data)
    if not write_text_atomic(path, text):
        raise TaskWriteError(
            f"failed to write {path}",
            details={"path": str(path)},
        )


def _ensure_children(data: dict) -> list[str]:
    children = data.get("children")
    if not isinstance(children, list):
        children = []
        data["children"] = children
    cleaned: list[str] = []
    for item in children:
        if isinstance(item, str) and item not in cleaned:
            cleaned.append(item)
    data["children"] = cleaned
    return cleaned


def create_task_record(
    tasks_root: Path,
    task_dir: Path,
    record: Mapping[str, Any],
    *,
    parent_dir: Path | None = None,
    force: bool = False,
) -> tuple[dict, str, bool]:
    """Create ``task.json`` (and optional parent link) under one writer lock.

    Returns ``(record, version, created_dir)``. The caller still owns prd.md,
    jsonl manifests, hooks and session activation.
    """
    with file_lock(lock_path_for(tasks_root)):
        archived = _find_archived_dir(tasks_root, task_dir.name)
        if archived is not None:
            raise TaskExistsError(
                f"task is already archived: {task_dir.name}",
                details={"dir": task_dir.name, "archivedAt": str(archived)},
            )
        if task_dir.exists() and not force:
            raise TaskExistsError(
                f"task already exists: {task_dir.name}",
                details={"dir": task_dir.name},
            )

        created_dir = not task_dir.exists()
        if created_dir:
            task_dir.mkdir(parents=True)
        task_json = task_dir / FILE_TASK_JSON
        if not created_dir and task_json.exists():
            # --force is an explicit overwrite; unreadable data is still a
            # reason to stop rather than replace a potentially recoverable file.
            data, _, reason = _read_raw_record(task_json)
            if data is None:
                problem, hint = describe_json_read_failure(task_json, reason)
                raise TaskWriteError(
                    f"refusing to overwrite {task_json}: {problem}",
                    details={"path": str(task_json), "hint": hint},
                )

        current = dict(record)
        current["parent"] = None
        current.pop("parentId", None)
        parent_data: dict | None = None
        if parent_dir is not None:
            parent_json = parent_dir / FILE_TASK_JSON
            parent_data, _, parent_reason = _read_raw_record(parent_json)
            if parent_data is None:
                if created_dir:
                    try:
                        task_dir.rmdir()
                    except OSError:
                        pass
                problem, hint = describe_json_read_failure(parent_json, parent_reason)
                raise ParentNotFoundError(
                    f"parent task.json could not be read: {problem}",
                    details={"path": str(parent_json), "hint": hint},
                )

        try:
            current, token = write_record_file(task_dir, current)
            if parent_data is not None and parent_dir is not None:
                children = _ensure_children(parent_data)
                if task_dir.name not in children:
                    children.append(task_dir.name)
                _write_mirror(parent_dir / FILE_TASK_JSON, parent_data)
                current["parent"] = parent_dir.name
                parent_id = parent_data.get("id")
                if isinstance(parent_id, str) and parent_id.strip():
                    current["parentId"] = parent_id.strip()
                current, token = write_record_file(task_dir, current)
        except BaseException:
            if created_dir:
                try:
                    (task_dir / FILE_TASK_JSON).unlink()
                except OSError:
                    pass
                try:
                    task_dir.rmdir()
                except OSError:
                    pass
            raise
        return current, token, created_dir


def _link_parent(
    scan: ScanResult,
    owner: Path,
    child: dict,
    new_parent: TaskLocation,
    child_dir_name: str,
) -> tuple[dict, list[str]]:
    """Update parent mirrors in memory; returns (child, writes)."""
    warnings: list[str] = []
    old_parent_id = child.get("parentId")
    old_parent_name = child.get("parent")
    old_parent: TaskLocation | None = None
    if old_parent_id or old_parent_name:
        try:
            old_parent = _select_location(
                scan,
                str(old_parent_id or old_parent_name),
                owner,
            )
        except (TaskNotFoundError, AmbiguousTaskError):
            old_parent = None

    children = _ensure_children(new_parent.data)
    if child_dir_name not in children:
        children.append(child_dir_name)
        _write_mirror(new_parent.task_json, new_parent.data)

    if old_parent is not None and old_parent.directory != new_parent.directory:
        children = _ensure_children(old_parent.data)
        if child_dir_name in children:
            children.remove(child_dir_name)
            _write_mirror(old_parent.task_json, old_parent.data)

    child["parent"] = new_parent.dir_name
    parent_id = new_parent.data.get("id")
    if isinstance(parent_id, str) and parent_id.strip():
        child["parentId"] = parent_id.strip()
    else:
        child.pop("parentId", None)
        warnings.append(
            "parent has no id yet; run `task.py migrate --apply` to assign one"
        )
    return child, warnings


def _remove_parent_link(
    scan: ScanResult,
    owner: Path,
    child: dict,
    child_dir_name: str,
) -> list[str]:
    warnings: list[str] = []
    old_parent_id = child.get("parentId")
    old_parent_name = child.get("parent")
    if not old_parent_id and not old_parent_name:
        child["parent"] = None
        child.pop("parentId", None)
        return warnings
    try:
        old_parent = _select_location(
            scan,
            str(old_parent_id or old_parent_name),
            owner,
        )
    except (TaskNotFoundError, AmbiguousTaskError):
        warnings.append("recorded parent no longer resolves; parent link cleared")
        old_parent = None
    if old_parent is not None:
        children = _ensure_children(old_parent.data)
        if child_dir_name in children:
            children.remove(child_dir_name)
            _write_mirror(old_parent.task_json, old_parent.data)
    child["parent"] = None
    child.pop("parentId", None)
    return warnings


def _apply_changes(
    child: dict,
    changes: Mapping[str, Any],
    *,
    scan: ScanResult,
    owner: Path,
    now: str,
    dir_name: str,
) -> tuple[dict, list[str], list[str]]:
    """Apply requested changes in memory. Returns (record, changed, warnings)."""
    changed: list[str] = []
    warnings: list[str] = []
    record = copy.deepcopy(child)

    simple_fields = (
        "title",
        "description",
        "assignee",
        "priority",
        "package",
        "branch",
        "base_branch",
        "notes",
    )
    for field in simple_fields:
        value = changes.get(field, _UNSET)
        if value is _UNSET:
            continue
        if value is None and field not in ("title", "priority"):
            record[field] = None
        else:
            record[field] = value
        changed.append(field)

    if "status" in changes:
        target = normalize_status(changes["status"])
        if target is None:
            raise TaskValidationError(
                [f"status: unknown value {changes['status']!r}"]
            )
        current = normalize_status(record.get("status")) or "unknown"
        if target not in LEGAL_TRANSITIONS.get(current, frozenset()):
            raise TaskValidationError(
                [f"status: illegal transition {current} -> {target}"]
            )
        if target != current:
            record["status"] = target
            if target in CLOSED_STATUSES:
                record["closedAt"] = now
                record["completedAt"] = now
            else:
                record.pop("closedAt", None)
                record["completedAt"] = None
            changed.append("status")

    if "next_action" in changes:
        value = changes["next_action"]
        if value is None or not str(value).strip():
            if "nextAction" in record:
                record.pop("nextAction", None)
                changed.append("nextAction")
        else:
            record["nextAction"] = str(value).strip()
            changed.append("nextAction")

    if "labels" in changes:
        value = changes["labels"]
        labels: list[str] = []
        if isinstance(value, list):
            seen: set[str] = set()
            for item in value:
                if isinstance(item, str) and item.strip() and item.strip() not in seen:
                    seen.add(item.strip())
                    labels.append(item.strip())
        if labels:
            record["labels"] = labels
        else:
            record.pop("labels", None)
        changed.append("labels")

    if "meta" in changes and isinstance(changes["meta"], Mapping):
        meta = record.get("meta")
        if not isinstance(meta, dict):
            meta = {}
        meta.update(copy.deepcopy(dict(changes["meta"])))
        record["meta"] = meta
        changed.append("meta")

    if "extensions" in changes and isinstance(changes["extensions"], Mapping):
        extensions = record.get("extensions")
        if not isinstance(extensions, dict):
            extensions = {}
        extensions.update(copy.deepcopy(dict(changes["extensions"])))
        record["extensions"] = extensions
        changed.append("extensions")

    if changes.get("clear_parent"):
        parent_warnings = _remove_parent_link(
            scan, owner, record, dir_name
        )
        warnings.extend(parent_warnings)
        changed.append("parent")
    elif "parent" in changes and changes["parent"] is not None:
        parent_selector = str(changes["parent"])
        if parent_selector:
            try:
                new_parent = _select_location(scan, parent_selector, owner)
            except TaskNotFoundError as exc:
                raise ParentNotFoundError(str(exc), details=exc.details) from exc
            if new_parent.archived:
                raise TaskArchivedError(
                    "cannot link to an archived parent; reopen or move it first",
                    details={"parent": new_parent.relative_path},
                )
            if new_parent.task_id == record.get("id"):
                raise TaskValidationError(["parent: a task cannot be its own parent"])
            record, parent_warnings = _link_parent(
                scan, owner, record, new_parent, dir_name
            )
            warnings.extend(parent_warnings)
            changed.append("parent")

    return record, changed, warnings


def update_task_record(
    owner: Path,
    selector: str,
    *,
    changes: Mapping[str, Any],
    expect_version: str | None = None,
    now: str | None = None,
) -> tuple[TaskLocation, list[str], list[str]]:
    """Stale-checked read-modify-write. Returns (location, changed, warnings)."""
    tasks_root = tasks_root_for(owner)
    stamp = normalize_timestamp(now) or utc_now()
    if expect_version is not None:
        expect_version = expect_version.strip() or None
    with file_lock(lock_path_for(tasks_root)):
        scan = scan_task_locations(tasks_root, owner, include_archive=True)
        location = _select_location(scan, selector, owner)
        if location.archived:
            raise TaskArchivedError(
                "archived tasks are read-only; move the directory back into "
                ".memerig/tasks/ before updating it in place",
                details={"path": location.relative_path},
            )
        if expect_version and expect_version != location.token:
            raise StaleVersionError(
                "task changed since the supplied version",
                current_version=location.token,
                current_record=location.data,
            )

        record, changed, warnings = _apply_changes(
            location.data,
            changes,
            scan=scan,
            owner=owner,
            now=stamp,
            dir_name=location.dir_name,
        )
        if changed:
            title = record.get("title")
            if not isinstance(title, str) or not title.strip():
                raise TaskValidationError(["title: must be a non-empty string"])
            record["updatedAt"] = stamp
        try:
            normalized, coerce_warnings = coerce_task_record(
                record,
                dir_name=location.dir_name,
                path=location.task_json,
                now=stamp,
                assign_id=True,
            )
        except TaskSchemaError as exc:
            raise TaskValidationError(exc.errors) from exc
        warnings.extend(coerce_warnings)

        if not changed and normalized == location.data:
            return location, [], warnings
        normalized, token = write_record_file(location.directory, normalized)
        updated = TaskLocation(
            directory=location.directory,
            relative_path=location.relative_path,
            archived=location.archived,
            archive_month=location.archive_month,
            data=normalized,
            raw=record_bytes(normalized),
            token=token,
        )
        return updated, changed, warnings


def complete_task_record(
    owner: Path,
    selector: str,
    *,
    expect_version: str | None = None,
    now: str | None = None,
) -> tuple[TaskLocation, bool, list[str]]:
    """Close a task in place. Returns (location, changed, warnings).

    A replay clears leftover pointers without rewriting the record. The
    caller's version token is not enforced because completion changed it.
    """
    tasks_root = tasks_root_for(owner)
    stamp = normalize_timestamp(now) or utc_now()
    if expect_version is not None:
        expect_version = expect_version.strip() or None
    with file_lock(lock_path_for(tasks_root)):
        scan = scan_task_locations(tasks_root, owner, include_archive=True)
        location = _select_location(scan, selector, owner)
        current = normalize_status(location.data.get("status"))
        if current == STATUS_COMPLETED:
            clear_task_from_sessions(location.relative_path, owner)
            return location, False, ["task was already completed; nothing changed"]
        if current == STATUS_CANCELED:
            raise TaskValidationError(
                ["status: canceled task cannot be completed; reopen it first"]
            )
        if location.archived:
            raise TaskArchivedError(
                "archived task is not in the active tree; move it back before "
                "completing it in place",
                details={"path": location.relative_path},
            )
        if expect_version and expect_version != location.token:
            raise StaleVersionError(
                "task changed since the supplied version",
                current_version=location.token,
                current_record=location.data,
            )
        record = copy.deepcopy(location.data)
        record["status"] = STATUS_COMPLETED
        record["closedAt"] = stamp
        record["completedAt"] = stamp
        record["updatedAt"] = stamp
        try:
            normalized, warnings = coerce_task_record(
                record,
                dir_name=location.dir_name,
                path=location.task_json,
                now=stamp,
                assign_id=True,
            )
        except TaskSchemaError as exc:
            raise TaskValidationError(exc.errors) from exc
        normalized, token = write_record_file(location.directory, normalized)
        updated = TaskLocation(
            directory=location.directory,
            relative_path=location.relative_path,
            archived=False,
            archive_month=None,
            data=normalized,
            raw=record_bytes(normalized),
            token=token,
        )
        clear_task_from_sessions(location.relative_path, owner)
        return updated, True, warnings


# =============================================================================
# Views
# =============================================================================


def build_children_index(locations: Iterable[TaskLocation]) -> dict[str, list[str]]:
    """Derive child directories from parent edges, merged with explicit lists.

    The stored ``children`` list stays authoritative for legacy readers, but
    new v1 records derive the same view from ``parentId``/``parent``. A
    dangling parent or child reference never hides a task from its own row.
    """
    order = {location.dir_name: location for location in locations}
    by_id = {
        location.data.get("id"): location
        for location in locations
        if isinstance(location.data.get("id"), str)
    }
    merged: dict[str, list[str]] = {name: [] for name in order}
    for location in locations:
        explicit = location.data.get("children")
        if isinstance(explicit, list):
            for child in explicit:
                if isinstance(child, str) and child in order:
                    if child not in merged[location.dir_name]:
                        merged[location.dir_name].append(child)
        parent_key = location.data.get("parentId") or location.data.get("parent")
        parent = by_id.get(parent_key) if isinstance(parent_key, str) else None
        if parent is None and isinstance(parent_key, str):
            parent = order.get(parent_key)
        if parent is not None and location.dir_name not in merged[parent.dir_name]:
            merged[parent.dir_name].append(location.dir_name)
    return merged


def list_task_views(
    owner: Path,
    *,
    include_archive: bool = True,
    only_closed: bool = False,
    only_active: bool = False,
    status: str | None = None,
    assignee: str | None = None,
) -> tuple[list[dict], list[dict]]:
    """Return ``(items, problems)``. Items carry raw + v1 compatibility fields."""
    tasks_root = tasks_root_for(owner)
    scan = scan_task_locations(tasks_root, owner, include_archive=include_archive)
    children = build_children_index(scan.locations)
    status_filter = normalize_status(status) if status else None
    items: list[dict] = []
    for location in sorted(scan.locations, key=lambda loc: loc.dir_name):
        data = location.data
        canonical = normalize_status(data.get("status"))
        closed = location.archived or canonical in CLOSED_STATUSES
        if only_closed and not closed:
            continue
        if only_active and closed:
            continue
        if status_filter and canonical != status_filter:
            continue
        record_assignee = data.get("assignee")
        if assignee and record_assignee != assignee:
            continue
        items.append(
            {
                "dir": location.relative_path,
                "dir_name": location.dir_name,
                "id": data.get("id") or location.dir_name,
                "legacy_id": data.get("legacyId"),
                "name": data.get("name") or location.dir_name,
                "title": data.get("title") or data.get("name") or "unknown",
                "status": canonical or data.get("status", "unknown"),
                "closed": closed,
                "archived": location.archived,
                "archive_month": location.archive_month,
                "priority": data.get("priority", "P2"),
                "assignee": record_assignee or None,
                "parent": data.get("parent"),
                "parent_id": data.get("parentId"),
                "children": children.get(location.dir_name, []),
                "package": data.get("package"),
                "labels": data.get("labels") or [],
                "next_action": data.get("nextAction"),
                "schema_version": data.get("schemaVersion"),
                "updated_at": data.get("updatedAt"),
                "version": location.token,
            }
        )
    return items, scan.problems


def show_task(
    owner: Path,
    selector: str,
    *,
    include_archive: bool = True,
) -> tuple[TaskLocation, dict]:
    location = find_task_location(
        owner, selector, include_archive=include_archive
    )
    data = location.data
    view = {
        "task": data,
        "location": {
            "dir": location.relative_path,
            "archived": location.archived,
            "archive_month": location.archive_month,
            "closed": is_closed_status(data.get("status")),
        },
        "version": location.token,
    }
    return location, view


# =============================================================================
# CLI command handlers
# =============================================================================


def print_protocol_error(exc: TaskProtocolError, as_json: bool) -> None:
    if as_json:
        print(
            json.dumps(
                {
                    "error": {
                        "code": exc.code,
                        "message": str(exc),
                        "details": exc.details,
                    }
                },
                ensure_ascii=False,
            )
        )
        return
    print(colored(f"Error: {exc}", Colors.RED), file=sys.stderr)
    for key, value in exc.details.items():
        if key in ("current",):
            continue
        if isinstance(value, list):
            for item in value:
                print(f"  - {item}", file=sys.stderr)
        elif value:
            print(f"  {key}: {value}", file=sys.stderr)


def print_warnings(warnings: Iterable[str]) -> None:
    for warning in warnings:
        print(colored(f"Warning: {warning}", Colors.YELLOW), file=sys.stderr)


def cmd_show(args: argparse.Namespace) -> int:
    owner = resolve_owner()
    try:
        location, payload = show_task(
            owner,
            args.task,
            include_archive=not getattr(args, "active_only", False),
        )
    except TaskProtocolError as exc:
        print_protocol_error(exc, getattr(args, "json", False))
        return 1

    if getattr(args, "json", False):
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    data = location.data
    print(colored(f"Task: {data.get('title') or location.dir_name}", Colors.BLUE))
    print(f"  id:         {data.get('id') or '(legacy)'}")
    if data.get("legacyId"):
        print(f"  legacy id:  {data.get('legacyId')}")
    print(f"  status:     {normalize_status(data.get('status')) or data.get('status')}")
    print(f"  path:       {location.relative_path}")
    print(f"  archived:   {'yes' if location.archived else 'no'}")
    if data.get("nextAction"):
        print(f"  next:       {data.get('nextAction')}")
    if data.get("updatedAt"):
        print(f"  updated:    {data.get('updatedAt')}")
    print(f"  version:    {location.token}")
    return 0


def parse_extension_pairs(pairs: Iterable[str] | None) -> dict[str, Any] | None:
    if not pairs:
        return None
    out: dict[str, Any] = {}
    for pair in pairs:
        if "=" not in pair:
            raise TaskValidationError(
                [f"extension: expected KEY=JSON, got {pair!r}"]
            )
        key, raw = pair.split("=", 1)
        key = key.strip()
        if not key:
            raise TaskValidationError(["extension: key is empty"])
        try:
            out[key] = json.loads(raw)
        except json.JSONDecodeError:
            out[key] = raw
    return out


def parse_meta_pairs(pairs: Iterable[str] | None) -> dict[str, str] | None:
    if not pairs:
        return None
    out: dict[str, str] = {}
    for pair in pairs:
        if "=" not in pair:
            raise TaskValidationError([f"meta: expected KEY=VALUE, got {pair!r}"])
        key, value = pair.split("=", 1)
        key = key.strip()
        if not key:
            raise TaskValidationError(["meta: key is empty"])
        out[key] = value
    return out


def cmd_update(args: argparse.Namespace) -> int:
    owner = resolve_owner()
    changes: dict[str, Any] = {}
    for field, attr in (
        ("title", "title"),
        ("description", "description"),
        ("status", "status"),
        ("assignee", "assignee"),
        ("priority", "priority"),
        ("package", "package"),
        ("branch", "branch"),
        ("base_branch", "base_branch"),
        ("notes", "notes"),
    ):
        value = getattr(args, attr, None)
        if value is not None:
            changes[field] = value
    if getattr(args, "next_action", None) is not None:
        changes["next_action"] = args.next_action
    if getattr(args, "clear_next_action", False):
        changes["next_action"] = ""
    if getattr(args, "label", None):
        changes["labels"] = list(args.label)
    if getattr(args, "clear_labels", False):
        changes["labels"] = []
    if getattr(args, "parent", None) is not None:
        changes["parent"] = args.parent
    if getattr(args, "clear_parent", False):
        changes["clear_parent"] = True
    try:
        meta = parse_meta_pairs(getattr(args, "meta", None))
        if meta is not None:
            changes["meta"] = meta
        extensions = parse_extension_pairs(getattr(args, "extension", None))
        if extensions is not None:
            changes["extensions"] = extensions
    except TaskProtocolError as exc:
        print_protocol_error(exc, getattr(args, "json", False))
        return 1

    try:
        location, changed, warnings = update_task_record(
            owner,
            args.task,
            changes=changes,
            expect_version=getattr(args, "expect_version", None),
        )
    except TaskProtocolError as exc:
        print_protocol_error(exc, getattr(args, "json", False))
        return 1

    print_warnings(warnings)
    if getattr(args, "json", False):
        print(
            json.dumps(
                {
                    "task": location.data,
                    "location": {
                        "dir": location.relative_path,
                        "closed": location.closed,
                        "archived": location.archived,
                    },
                    "changed": changed,
                    "version": location.token,
                },
                ensure_ascii=False,
            )
        )
        return 0
    if changed:
        print(colored(f"Updated: {location.dir_name} ({', '.join(changed)})", Colors.GREEN))
    else:
        print(colored(f"No changes: {location.dir_name}", Colors.YELLOW))
    print(f"Version: {location.token}")
    return 0


def cmd_complete(args: argparse.Namespace) -> int:
    try:
        owner = resolve_owner()
        location, changed, warnings = complete_task_record(
            owner,
            args.task,
            expect_version=getattr(args, "expect_version", None),
        )
    except TaskProtocolError as exc:
        print_protocol_error(exc, getattr(args, "json", False))
        return 1

    print_warnings(warnings)
    if changed:
        # Integrations previously learned about completion from after_archive
        # (which also moved the directory). In-place close keeps the path, so
        # it emits its own event; subscribers should handle both.
        run_task_hooks("after_complete", location.task_json, owner)
    if getattr(args, "json", False):
        print(
            json.dumps(
                {
                    "task": location.data,
                    "location": {
                        "dir": location.relative_path,
                        "closed": location.closed,
                        "archived": location.archived,
                    },
                    "changed": changed,
                    "alreadyCompleted": not changed,
                    "version": location.token,
                },
                ensure_ascii=False,
            )
        )
        return 0
    if changed:
        print(
            colored(
                f"Completed: {location.dir_name} "
                f"(status {STATUS_COMPLETED}, path unchanged)",
                Colors.GREEN,
            )
        )
    else:
        print(
            colored(
                f"Already completed: {location.dir_name} (path unchanged)",
                Colors.YELLOW,
            )
        )
    print(f"Version: {location.token}")
    return 0


def cmd_list_closed(args: argparse.Namespace) -> int:
    owner = resolve_owner()
    items, problems = list_task_views(
        owner,
        include_archive=True,
        only_closed=True,
        assignee=getattr(args, "mine_assignee", None),
    )
    if getattr(args, "json", False):
        print(json.dumps({"tasks": items, "problems": problems}, ensure_ascii=False))
        return 0
    print(colored("Closed tasks:", Colors.BLUE))
    print()
    if not items:
        print("  (no closed tasks)")
        return 0
    for item in items:
        suffix = f" [archived {item['archive_month']}]" if item["archived"] else ""
        print(f"  - {item['dir_name']}/ ({item['status']}){suffix}")
        print(f"      id: {item['id']}")
    print()
    print(f"Total: {len(items)} task(s)")
    return 0


def cmd_schema(_args: argparse.Namespace) -> int:
    print(json.dumps(task_json_schema(), indent=2, ensure_ascii=False))
    return 0
