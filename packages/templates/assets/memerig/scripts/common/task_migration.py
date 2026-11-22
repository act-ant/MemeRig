"""
Preview/apply migration of legacy task records to task schema v1.

Provides:
    preview_migration — compute the full change set without writing
    apply_migration   — explicit apply with preflight, backup and rollback
    cmd_migrate       — CLI handler for `task.py migrate`

The preview is the contract: it names every record that would change, every
legacy id that would become a UUID, every unresolved parent reference, and
every unrecognized status that blocks apply. ``apply`` re-runs the preview,
refuses on errors, verifies that no record changed underneath the preview,
copies the whole tasks tree to ``.memerig/.backup-task-migration-<stamp>/``,
and only then replaces records atomically.
"""

from __future__ import annotations

import argparse
import copy
import json
import shutil
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from .file_lock import file_lock
from .io import write_text_atomic
from .log import Colors, colored
from .task_protocol import (
    TaskProtocolError,
    print_protocol_error,
    write_record_file,
    lock_path_for,
    resolve_owner,
    scan_task_locations,
    tasks_root_for,
)
from .task_schema import (
    CLOSED_STATUSES,
    STATUS_COMPLETED,
    TaskSchemaError,
    coerce_task_record,
    normalize_status,
    utc_now,
    validate_hierarchy,
    validate_record,
)


class MigrationBlockedError(TaskProtocolError):
    code = "migration_blocked"

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(
            "migration preflight failed; no files were written",
            details={"errors": errors},
        )


class MigrationStaleError(TaskProtocolError):
    code = "migration_stale"


@dataclass
class MigrationEntry:
    directory: Path
    relative_path: str
    archived: bool
    archive_month: str | None
    raw: bytes
    old_record: dict
    new_record: dict
    changed: bool
    old_id: str | None
    new_id: str
    status: str
    changes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_payload(self) -> dict:
        return {
            "path": self.relative_path,
            "archived": self.archived,
            "archiveMonth": self.archive_month,
            "oldId": self.old_id,
            "newId": self.new_id,
            "status": self.status,
            "changed": self.changed,
            "changes": self.changes,
            "warnings": self.warnings,
            "errors": self.errors,
            "newRecord": self.new_record,
        }


@dataclass
class MigrationPlan:
    entries: list[MigrationEntry]
    errors: list[str]
    warnings: list[str]
    problems: list[dict]
    summary: dict

    @property
    def changed_entries(self) -> list[MigrationEntry]:
        return [entry for entry in self.entries if entry.changed]

    @property
    def blocked(self) -> bool:
        return bool(self.errors)

    def to_payload(self) -> dict:
        return {
            "schemaVersion": 1,
            "summary": self.summary,
            "errors": self.errors,
            "warnings": self.warnings,
            "problems": self.problems,
            "entries": [entry.to_payload() for entry in self.entries],
        }


@dataclass
class MigrationResult:
    backup_path: Path | None
    changed: int
    unchanged: int
    entries: list[MigrationEntry]

    def to_payload(self) -> dict:
        return {
            "backupPath": str(self.backup_path) if self.backup_path else None,
            "changed": self.changed,
            "unchanged": self.unchanged,
            "oldToNew": {
                entry.old_id: entry.new_id
                for entry in self.entries
                if entry.old_id and entry.old_id != entry.new_id
            },
        }


def _field_changes(old: Mapping[str, Any], new: Mapping[str, Any]) -> list[str]:
    changes: list[str] = []
    keys = list(new.keys()) + [key for key in old.keys() if key not in new]
    for key in keys:
        if old.get(key) != new.get(key):
            changes.append(key)
    return sorted(set(changes))


def _resolve_parent(
    entry: MigrationEntry,
    by_dir: Mapping[str, MigrationEntry],
    by_ref: Mapping[str, MigrationEntry],
    warnings: list[str],
) -> None:
    record = entry.new_record
    parent_ref = record.get("parent")
    parent_id = record.get("parentId")
    parent: MigrationEntry | None = None
    if isinstance(parent_id, str):
        parent = by_ref.get(parent_id)
    if parent is None and isinstance(parent_ref, str):
        parent = by_dir.get(parent_ref) or by_ref.get(parent_ref)
    if parent is None:
        if isinstance(parent_id, str):
            warnings.append(
                f"{entry.relative_path}: parentId {parent_id!r} does not resolve; "
                "dropped parentId, legacy `parent` kept"
            )
            record.pop("parentId", None)
        if isinstance(parent_ref, str) and parent_ref:
            warnings.append(
                f"{entry.relative_path}: parent {parent_ref!r} does not resolve "
                "(dangling legacy reference preserved as `parent`)"
            )
        return
    if parent.new_id == entry.new_id:
        warnings.append(f"{entry.relative_path}: self-parent link removed")
        record["parent"] = None
        record.pop("parentId", None)
        return
    record["parentId"] = parent.new_id
    record["parent"] = parent.directory.name


def preview_migration(owner: Path) -> MigrationPlan:
    tasks_root = tasks_root_for(owner)
    scan = scan_task_locations(tasks_root, owner, include_archive=True)
    now = utc_now()
    entries: list[MigrationEntry] = []
    errors: list[str] = []
    warnings: list[str] = []
    problems = list(scan.problems)

    for location in scan.locations:
        entry_errors: list[str] = []
        entry_warnings: list[str] = []
        old_record = copy.deepcopy(location.data)
        old_id = old_record.get("id") if isinstance(old_record.get("id"), str) else None
        task_status = normalize_status(old_record.get("status"))
        if location.archived and task_status not in CLOSED_STATUSES:
            # An archive path is itself a closed signal. Preserve a terminal
            # state even if the record was hand-edited while archived.
            if task_status is None:
                entry_errors.append(
                    f"{location.relative_path}: unrecognized status "
                    f"{old_record.get('status')!r} in archive; map it before migrating"
                )
                task_status = "completed"
            else:
                entry_warnings.append(
                    f"{location.relative_path}: archived task had status "
                    f"{task_status}; normalized to completed"
                )
                old_record["status"] = STATUS_COMPLETED
                task_status = STATUS_COMPLETED
        try:
            new_record, coerce_warnings = coerce_task_record(
                old_record,
                dir_name=location.dir_name,
                path=location.task_json,
                now=now,
                assign_id=True,
            )
        except TaskSchemaError as exc:
            entry_errors.extend(
                f"{location.relative_path}: {error}" for error in exc.errors
            )
            entries.append(
                MigrationEntry(
                    directory=location.directory,
                    relative_path=location.relative_path,
                    archived=location.archived,
                    archive_month=location.archive_month,
                    raw=location.raw,
                    old_record=old_record,
                    new_record={},
                    changed=False,
                    old_id=old_id,
                    new_id="",
                    status=task_status or "unknown",
                    warnings=entry_warnings,
                    errors=entry_errors,
                )
            )
            continue
        entry_warnings.extend(coerce_warnings)
        new_id = str(new_record["id"])
        changed = new_record != old_record
        entries.append(
            MigrationEntry(
                directory=location.directory,
                relative_path=location.relative_path,
                archived=location.archived,
                archive_month=location.archive_month,
                raw=location.raw,
                old_record=old_record,
                new_record=new_record,
                changed=changed,
                old_id=old_id,
                new_id=new_id,
                status=str(new_record.get("status")),
                changes=_field_changes(old_record, new_record),
                warnings=entry_warnings,
                errors=entry_errors,
            )
        )

    # Second pass: resolve hierarchy across all records.
    by_dir = {entry.directory.name: entry for entry in entries}
    by_ref: dict[str, MigrationEntry] = {}
    for entry in entries:
        for ref in (entry.new_id, entry.old_id, entry.new_record.get("legacyId")):
            if isinstance(ref, str) and ref and ref not in by_ref:
                by_ref[ref] = entry

    for entry in entries:
        if entry.errors or not entry.new_record:
            continue
        before = copy.deepcopy(entry.new_record)
        _resolve_parent(entry, by_dir, by_ref, entry.warnings)
        if entry.new_record != before:
            entry.changes = sorted(
                set(entry.changes)
                | set(_field_changes(before, entry.new_record))
            )
            entry.changed = True

    # Derive the children mirror from parent edges, merged with explicit
    # entries that still resolve. This makes child views derivable while
    # keeping every legacy reader working.
    derived: dict[str, list[str]] = {entry.directory.name: [] for entry in entries}
    for entry in entries:
        if entry.errors or not entry.new_record:
            continue
        parent_ref = entry.new_record.get("parentId") or entry.new_record.get("parent")
        parent = by_ref.get(str(parent_ref)) if parent_ref else None
        if parent is not None:
            if entry.directory.name not in derived[parent.directory.name]:
                derived[parent.directory.name].append(entry.directory.name)
    for entry in entries:
        if entry.errors or not entry.new_record:
            continue
        explicit = entry.new_record.get("children")
        children: list[str] = []
        if isinstance(explicit, list):
            for child in explicit:
                if isinstance(child, str) and child in by_dir and child not in children:
                    children.append(child)
        for child in derived.get(entry.directory.name, []):
            if child not in children:
                children.append(child)
        if entry.new_record.get("children") != children:
            entry.new_record["children"] = children
            entry.changes = sorted(set(entry.changes) | {"children"})
            entry.changed = True

    known_ids = {
        entry.new_id: entry.new_record
        for entry in entries
        if entry.new_id and not entry.errors
    }
    for entry in entries:
        if entry.errors or not entry.new_record:
            continue
        record_errors = validate_record(entry.new_record, known_ids=known_ids)
        entry.errors.extend(
            f"{entry.relative_path}: {error}" for error in record_errors
        )

    hierarchy_errors, hierarchy_warnings = validate_hierarchy(
        entry.new_record for entry in entries if entry.new_record and not entry.errors
    )
    errors.extend(hierarchy_errors)
    warnings.extend(hierarchy_warnings)
    for entry in entries:
        errors.extend(entry.errors)
        warnings.extend(entry.warnings)
    # De-duplicate while preserving order.
    errors = list(dict.fromkeys(errors))
    warnings = list(dict.fromkeys(warnings))

    changed = sum(1 for entry in entries if entry.changed and not entry.errors)
    blocked = sum(1 for entry in entries if entry.errors)
    summary = {
        "total": len(entries),
        "active": sum(1 for entry in entries if not entry.archived),
        "archived": sum(1 for entry in entries if entry.archived),
        "changed": changed,
        "unchanged": sum(1 for entry in entries if not entry.changed and not entry.errors),
        "blocked": blocked,
        "errors": len(errors),
        "warnings": len(warnings),
    }
    return MigrationPlan(
        entries=entries,
        errors=errors,
        warnings=warnings,
        problems=problems,
        summary=summary,
    )


def _backup_tasks(owner: Path, tasks_root: Path, plan: MigrationPlan) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    base = owner / ".memerig" / f".backup-task-migration-{stamp}"
    backup = base
    suffix = 1
    while backup.exists():
        backup = base.with_name(f"{base.name}-{suffix}")
        suffix += 1
    backup.mkdir(parents=True)
    shutil.copytree(
        tasks_root,
        backup / "tasks",
        ignore=shutil.ignore_patterns("__pycache__", ".task.lock"),
    )
    manifest = {
        "schemaVersion": 1,
        "createdAt": utc_now(),
        "source": str(tasks_root),
        "summary": plan.summary,
        "oldToNew": {
            entry.old_id: entry.new_id
            for entry in plan.entries
            if entry.old_id and entry.old_id != entry.new_id
        },
        "entries": [
            {
                "path": entry.relative_path,
                "oldId": entry.old_id,
                "newId": entry.new_id,
                "status": entry.status,
                "changes": entry.changes,
            }
            for entry in plan.entries
        ],
    }
    if not write_text_atomic(
        backup / "manifest.json",
        json.dumps(manifest, indent=2, ensure_ascii=False),
    ):
        raise TaskProtocolError(
            f"failed to write migration manifest in {backup}",
            details={"path": str(backup)},
        )
    return backup


def apply_migration(owner: Path) -> MigrationResult:
    plan = preview_migration(owner)
    if plan.errors:
        raise MigrationBlockedError(plan.errors)
    changed_entries = plan.changed_entries
    if not changed_entries:
        return MigrationResult(
            backup_path=None,
            changed=0,
            unchanged=sum(1 for entry in plan.entries if not entry.changed),
            entries=plan.entries,
        )

    tasks_root = tasks_root_for(owner)
    with file_lock(lock_path_for(tasks_root)):
        # Re-read under the writer lock: the preview is only a promise if no
        # record changed between preview and apply.
        stale: list[str] = []
        for entry in changed_entries:
            try:
                current = (entry.directory / "task.json").read_bytes()
            except OSError:
                stale.append(entry.relative_path)
                continue
            if current != entry.raw:
                stale.append(entry.relative_path)
        if stale:
            raise MigrationStaleError(
                "task records changed between preview and apply; re-run preview",
                details={"paths": stale},
            )

        backup = _backup_tasks(owner, tasks_root, plan)
        written: list[MigrationEntry] = []
        try:
            for entry in changed_entries:
                write_record_file(entry.directory, entry.new_record)
                written.append(entry)
        except BaseException as exc:
            for entry in written:
                try:
                    write_text_atomic(
                        entry.directory / "task.json",
                        entry.raw.decode("utf-8"),
                    )
                except BaseException:
                    pass
            raise TaskProtocolError(
                f"migration failed after writing {len(written)} record(s); "
                f"originals are in {backup}",
                details={"backup": str(backup), "cause": str(exc)},
            ) from exc

    return MigrationResult(
        backup_path=backup,
        changed=len(changed_entries),
        unchanged=sum(1 for entry in plan.entries if not entry.changed),
        entries=plan.entries,
    )


def cmd_migrate(args: argparse.Namespace) -> int:
    owner = resolve_owner()
    as_json = getattr(args, "json", False)
    try:
        if getattr(args, "apply", False):
            result = apply_migration(owner)
            if as_json:
                print(json.dumps(result.to_payload(), ensure_ascii=False))
            else:
                if result.backup_path is None:
                    print(colored("Nothing to migrate.", Colors.GREEN))
                else:
                    print(
                        colored(
                            f"Migrated {result.changed} task record(s).",
                            Colors.GREEN,
                        )
                    )
                    print(f"Backup: {result.backup_path}")
            return 0

        plan = preview_migration(owner)
        if as_json:
            print(json.dumps(plan.to_payload(), ensure_ascii=False))
        else:
            print(colored("Task schema migration (preview)", Colors.BLUE))
            print()
            for entry in plan.entries:
                marker = "CHANGE" if entry.changed else "ok"
                if entry.errors:
                    marker = "BLOCK"
                print(f"  [{marker}] {entry.relative_path}")
                if entry.changed and entry.changes:
                    print(f"      fields: {', '.join(entry.changes)}")
                if entry.old_id and entry.old_id != entry.new_id:
                    print(f"      id: {entry.old_id} -> {entry.new_id}")
                for warning in entry.warnings:
                    print(f"      warning: {warning}")
                for error in entry.errors:
                    print(f"      error: {error}")
            print()
            summary = plan.summary
            print(
                f"Total {summary['total']} task(s): "
                f"{summary['changed']} change, {summary['unchanged']} unchanged, "
                f"{summary['blocked']} blocked"
            )
            if plan.problems:
                print(f"Unreadable task.json files: {len(plan.problems)}")
            if plan.errors:
                print()
                print(colored("Preflight errors block apply:", Colors.RED))
                for error in plan.errors:
                    print(f"  - {error}")
                return 1
            print()
            print("Apply with: python3 .memerig/scripts/task.py migrate --apply")
        if plan.errors:
            return 1
        return 0
    except TaskProtocolError as exc:
        print_protocol_error(exc, as_json)
        return 1
