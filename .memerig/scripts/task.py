#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Task Management Script.

Usage:
    python3 task.py create "<title>" --description "<desc>" [--slug <name>] [--assignee <dev>] [--priority P0|P1|P2|P3] [--parent <dir>] [--package <pkg>] [--no-start] [--force]
    python3 task.py add-context <dir> <file> <path> [reason] # Add jsonl entry
    python3 task.py validate <dir>              # Validate jsonl files
    python3 task.py list-context <dir>          # List jsonl entries
    python3 task.py start <dir>                 # Set active task, record current branch
    python3 task.py current [--source] [--json] # Show active task
    python3 task.py finish                      # Clear active task
    python3 task.py set-branch <dir> <branch>   # Set git branch
    python3 task.py set-base-branch <dir> <branch>  # Set PR target branch
    python3 task.py set-scope <dir> <scope>     # Set scope for PR title
    python3 task.py set-meta <dir> <key> <value>  # Set a task metadata key
    python3 task.py rename <dir> <new-slug> [--dry-run]  # Rename task + references
    python3 task.py archive <task-dir> [--skip-branch-validation]  # Archive completed task
    python3 task.py list                        # List active tasks
    python3 task.py list-archive [month]        # List archived tasks
    python3 task.py add-subtask <parent-dir> <child-dir>     # Link child to parent
    python3 task.py remove-subtask <parent-dir> <child-dir>  # Unlink child from parent
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common.log import Colors, colored
from common.paths import (
    DEVELOPER_HINT,
    DIR_WORKFLOW,
    DIR_TASKS,
    FILE_TASK_JSON,
    get_repo_root,
    get_developer,
    get_tasks_dir,
    get_current_task,
)
from common.active_task import (
    clear_active_task,
    resolve_active_task,
    resolve_context_key,
    set_active_task,
)
from common.file_lock import file_lock
from common.git import current_branch_name
from common.io import (
    describe_json_read_failure,
    read_json_checked,
    write_json,
)
from common.task_utils import resolve_task_dir, run_task_hooks
from common.tasks import iter_active_tasks, children_progress

# Import command handlers from split modules (also re-exports for plan.py compatibility)
from common.task_store import (
    cmd_create,
    cmd_rename,
    cmd_archive,
    cmd_set_branch,
    cmd_set_base_branch,
    cmd_set_scope,
    cmd_set_meta,
    cmd_add_subtask,
    cmd_remove_subtask,
)
from common.task_context import (
    cmd_add_context,
    cmd_validate,
    cmd_list_context,
    curated_entry_count,
)
from common.task_protocol import (
    TaskProtocolError,
    TaskNotFoundError,
    cmd_complete,
    cmd_list_closed,
    cmd_schema,
    cmd_show,
    cmd_update,
    find_task_location,
    lock_path_for,
    print_protocol_error,
    resolve_owner,
    token_for,
)
from common.task_migration import cmd_migrate
from common.task_schema import CLOSED_STATUSES, normalize_status


# =============================================================================
# Command: start / finish
# =============================================================================

def _record_start_state(
    task_json_path: Path,
    data: dict | None,
    reason: str | None,
    repo_root: Path,
    label: str = "",
) -> None:
    """Move a freshly started task to in_progress and record its branch.

    Both updates share one read/write: the status flip from planning, and the
    checked-out branch when `branch` is still empty. Recording at start is what
    keeps `branch` trustworthy at archive time — a task whose branch is only
    ever set by hand tends to reach archive with `branch: null`.

    Tolerant on purpose — a broken task.json does not fail `start`, because the
    session pointer is the point of the command. But the read overwrites the
    file it just read, so no failure may be silent: without a message the
    absent status line looks like the task simply was not in planning.
    """
    if data is None:
        problem, hint = describe_json_read_failure(task_json_path, reason)
        print(
            colored(f"Warning: {problem}; task.json not updated.", Colors.YELLOW),
            file=sys.stderr,
        )
        print(hint, file=sys.stderr)
        return

    applied: list[str] = []

    if normalize_status(data.get("status")) == "planning":
        data["status"] = "in_progress"
        applied.append(f"✓ Status: planning → in_progress{label}")

    # Only fill an empty field: an explicit `set-branch` must survive a later
    # `start` (re-starting a task after a checkout is a normal thing to do).
    base_branch_conflict: str | None = None
    if not data.get("branch"):
        branch = current_branch_name(repo_root)
        if branch:
            data["branch"] = branch
            applied.append(f"✓ Branch recorded: {branch}{label}")
            if branch == data.get("base_branch"):
                base_branch_conflict = branch
        else:
            print(
                colored(
                    "Note: no checked-out branch (detached HEAD, or not a git "
                    "repository); task branch not recorded.",
                    Colors.YELLOW,
                ),
                file=sys.stderr,
            )

    if not applied:
        return

    if not write_json(task_json_path, data):
        print(
            colored(
                f"Warning: Failed to write {task_json_path}; "
                "status and branch are unchanged.",
                Colors.YELLOW,
            ),
            file=sys.stderr,
        )
        return

    for line in applied:
        print(colored(line, Colors.GREEN))

    if base_branch_conflict:
        # Recorded anyway — the value is true, it just cannot describe a PR.
        # Archive refuses this shape, so say so now rather than at the gate.
        print(
            colored(
                f"Warning: '{base_branch_conflict}' is also this task's base_branch; "
                "a PR cannot target its own branch, and archive will refuse it.",
                Colors.YELLOW,
            ),
            file=sys.stderr,
        )
        print(
            f"Once you branch off, run: python3 {DIR_WORKFLOW}/scripts/task.py "
            "set-branch <task> <feature-branch>",
            file=sys.stderr,
        )


def cmd_start(args: argparse.Namespace) -> int:
    """Set active task."""
    try:
        repo_root = resolve_owner()
    except TaskProtocolError as exc:
        print_protocol_error(exc, False)
        return 1
    task_input = args.dir

    if not task_input:
        print(colored("Error: task directory or name required", Colors.RED))
        return 1

    try:
        location = find_task_location(repo_root, task_input)
    except TaskNotFoundError:
        # Preserve path/name diagnostics and the ability to inspect a corrupt
        # task.json through the active-task context.
        full_path = resolve_task_dir(task_input, repo_root)
        if full_path is None:
            return 1
    except TaskProtocolError as exc:
        print_protocol_error(exc, False)
        return 1
    else:
        if location.closed:
            print(colored(f"Error: Task is closed: {task_input}", Colors.RED), file=sys.stderr)
            return 1
        full_path = location.directory

    if not full_path.is_dir():
        print(colored(f"Error: Task not found: {task_input}", Colors.RED))
        print("Hint: Use task name (e.g., 'my-task') or full path (e.g., '.memerig/tasks/01-31-my-task')")
        return 1

    # Context-manifest gate (#573): a seeded-but-uncurated implement/check
    # manifest means every sub-agent dispatched for this task runs with zero
    # spec context, and nothing downstream surfaces that to the main session.
    # An absent manifest is not gated — create seeds the files only on
    # sub-agent-capable platforms, so absence means no sub-agent reads them.
    if not getattr(args, "allow_empty_context", False):
        empty_manifests = [
            name
            for name in ("implement.jsonl", "check.jsonl")
            if curated_entry_count(full_path / name) == 0
        ]
        if empty_manifests:
            print(colored(
                f"Error: {' and '.join(empty_manifests)} "
                f"{'has' if len(empty_manifests) == 1 else 'have'} no curated entries",
                Colors.RED,
            ))
            print("Sub-agents (implement/check) would run with zero spec context.")
            print(f"  Curate:  python3 .memerig/scripts/task.py add-context {task_input} implement <path> \"<why>\"")
            print(f"  Verify:  python3 .memerig/scripts/task.py validate {task_input}")
            print("  Intentionally empty? Re-run start with --allow-empty-context")
            return 1

    # Session pointers use paths relative to the task-owning project.
    try:
        task_dir = full_path.relative_to(repo_root.resolve()).as_posix()
    except ValueError:
        # resolve_task_dir already refused everything outside the repo, so
        # this is unreachable in practice. Refuse rather than fall back to
        # str(full_path) — that fallback (a lexical relative_to() paired with
        # an absolute-path fallback) is exactly the pattern that let a `..`
        # ref escape into storage before this fix.
        print(colored(f"Error: Task not found: {task_input}", Colors.RED))
        print("Hint: Use task name (e.g., 'my-task') or full path (e.g., '.memerig/tasks/01-31-my-task')")
        return 1

    task_json_path = full_path / FILE_TASK_JSON

    context_key = resolve_context_key()
    active = None
    try:
        with file_lock(lock_path_for(get_tasks_dir(repo_root))):
            # Re-read under the same lock as complete/update. A close may
            # have landed while the task's context manifests were checked.
            data, reason = read_json_checked(task_json_path)
            if data is not None and normalize_status(data.get("status")) in CLOSED_STATUSES:
                print(colored(f"Error: Task is closed: {task_input}", Colors.RED), file=sys.stderr)
                return 1
            if context_key:
                active = set_active_task(task_dir, repo_root)
                if active is None:
                    print(colored("Error: Failed to set current task", Colors.RED), file=sys.stderr)
                    return 1
            if task_json_path.is_file():
                _record_start_state(task_json_path, data, reason, repo_root, "" if context_key else " (degraded)")
    except OSError as exc:
        print(colored(f"Error: Could not start task: {exc}", Colors.RED), file=sys.stderr)
        return 1

    if active:
        print(colored(f"✓ Current task set to: {task_dir}", Colors.GREEN))
        print(f"Source: {active.source}")
        print()
        print(colored("The hook will now inject context from this task's jsonl files.", Colors.BLUE))
    else:
        print(colored(
            "ℹ Session identity not available; active-task pointer not persisted "
            "this session (degraded mode). AI continues based on conversation context.",
            Colors.YELLOW,
        ))
        print(colored(
            "Hint: run inside an AI IDE/session that exposes session identity, "
            "or set MEMERIG_CONTEXT_ID before running task.py start.",
            Colors.YELLOW,
        ))

    if active or task_json_path.is_file():
        run_task_hooks("after_start", task_json_path, repo_root)
    return 0


def cmd_finish(args: argparse.Namespace) -> int:
    """Clear active task."""
    try:
        repo_root = resolve_owner()
    except TaskProtocolError as exc:
        print_protocol_error(exc, False)
        return 1
    active = clear_active_task(repo_root)
    current = active.task_path

    if not current:
        print(colored("No current task set", Colors.YELLOW))
        return 0

    # Resolve task.json path before clearing
    task_json_path = repo_root / current / FILE_TASK_JSON

    print(colored(f"✓ Cleared current task (was: {current})", Colors.GREEN))
    print(f"Source: {active.source}")

    if task_json_path.is_file():
        run_task_hooks("after_finish", task_json_path, repo_root)
    return 0


def cmd_current(args: argparse.Namespace) -> int:
    """Show active task."""
    try:
        repo_root = resolve_owner()
    except TaskProtocolError as exc:
        print_protocol_error(exc, args.json)
        return 1
    active = resolve_active_task(repo_root)

    if getattr(args, "json", False):
        task_obj = None
        read_error = None
        if active.task_path:
            task_json_path = repo_root / active.task_path / FILE_TASK_JSON
            data, reason = read_json_checked(task_json_path)
            if data is None:
                # Without this, a corrupt task.json emits null for every field
                # — indistinguishable from a task whose fields really are null.
                problem, hint = describe_json_read_failure(task_json_path, reason)
                read_error = {
                    "file": str(task_json_path),
                    "reason": reason,
                    "message": f"{problem}. {hint}",
                }
                data = {}
            task_obj = {
                "dir": active.task_path,
                "id": data.get("id") or data.get("name"),
                "title": data.get("title"),
                "status": data.get("status"),
                "parent": data.get("parent"),
                "children": data.get("children", []),
                "branch": data.get("branch"),
                "base_branch": data.get("base_branch"),
            }
        payload = {
            "current_task": task_obj,
            "source": active.source,
            "stale": active.stale,
        }
        # Only present when the read failed, so the healthy shape is unchanged.
        if read_error:
            payload["error"] = read_error
        print(json.dumps(payload, ensure_ascii=False))
        return 0 if active.task_path else 1

    if args.source:
        print(f"Current task: {active.task_path or '(none)'}")
        print(f"Source: {active.source}")
        if active.stale:
            print("State: stale")
        return 0 if active.task_path else 1

    if active.task_path:
        print(active.task_path)
        return 0

    return 1


# =============================================================================
# Command: list
# =============================================================================

def _display_status(t, all_statuses: dict) -> str:
    """Return the status label to show for a task in `list` output.

    A parent task's stored status stays "planning" until someone runs
    `task.py start` on the parent directly, even while its children are
    actively being worked — a misleading label for anyone scanning the
    list (#399 item 3). Show "active" instead when at least one child is
    past planning; the stored status.json value is left untouched.
    """
    if t.status == "planning" and t.children:
        child_in_flight = any(
            all_statuses.get(c) not in (None, "planning") for c in t.children
        )
        if child_in_flight:
            return "active"
    return t.status


def cmd_list(args: argparse.Namespace) -> int:
    """List active tasks."""
    repo_root = get_repo_root()
    try:
        owner = resolve_owner()
    except TaskProtocolError as exc:
        print(colored(f"Error: {exc}", Colors.RED), file=sys.stderr)
        for key, value in exc.details.items():
            print(f"  {key}: {value}", file=sys.stderr)
        return 1
    tasks_dir = get_tasks_dir(owner)
    current_task = get_current_task(owner)
    developer = get_developer(repo_root)
    filter_mine = args.mine
    filter_status = normalize_status(args.status) or args.status
    as_json = getattr(args, "json", False)

    if filter_mine and not developer:
        if as_json:
            print(json.dumps({"error": "No developer set", "hint": DEVELOPER_HINT}), file=sys.stderr)
        else:
            print(colored("Error: No developer set. Run init_developer.py first", Colors.RED), file=sys.stderr)
            print(DEVELOPER_HINT, file=sys.stderr)
        return 1

    # Closed view includes both in-place closes and the legacy archive.
    if getattr(args, "closed", False):
        args.mine_assignee = developer if filter_mine else None
        return cmd_list_closed(args)

    # Single pass: collect all tasks via shared iterator
    all_tasks = {t.dir_name: t for t in iter_active_tasks(tasks_dir)}
    all_statuses = {name: t.status for name, t in all_tasks.items()}
    visible_tasks = {
        name: task
        for name, task in all_tasks.items()
        if (not filter_mine or task.assignee == developer)
        and (task.status == filter_status if filter_status else task.status not in CLOSED_STATUSES)
    }

    if as_json:
        items = []
        for dir_name in sorted(visible_tasks):
            t = visible_tasks[dir_name]
            task_json = tasks_dir / dir_name / FILE_TASK_JSON
            try:
                version = token_for(task_json.read_bytes())
            except OSError:
                version = None
            status_value = t.raw.get("status")
            items.append({
                "dir": f"{DIR_WORKFLOW}/{DIR_TASKS}/{dir_name}",
                "id": t.raw.get("id") or dir_name,
                "legacy_id": t.raw.get("legacyId"),
                "title": t.title,
                "status": t.status,
                "display_status": _display_status(t, all_statuses),
                "priority": t.priority,
                "assignee": t.assignee or None,
                "parent": t.parent,
                "parent_id": t.raw.get("parentId"),
                "children": list(t.children),
                "package": t.package,
                "closed": t.status in CLOSED_STATUSES,
                "archived": False,
                "labels": t.raw.get("labels") or [],
                "next_action": t.raw.get("nextAction"),
                "schema_version": t.raw.get("schemaVersion"),
                "updated_at": t.raw.get("updatedAt"),
                "version": version,
                "raw_status": status_value,
            })
        print(json.dumps({"tasks": items}, ensure_ascii=False))
        return 0

    if filter_mine:
        print(colored(f"My tasks (assignee: {developer}):", Colors.BLUE))
    elif filter_status:
        print(colored(f"Tasks with status {filter_status}:", Colors.BLUE))
    else:
        print(colored("All active tasks:", Colors.BLUE))
    print()

    # Display tasks hierarchically
    count = 0

    def _print_task(dir_name: str, indent: int = 0) -> None:
        nonlocal count
        t = visible_tasks[dir_name]

        relative_path = f"{DIR_WORKFLOW}/{DIR_TASKS}/{dir_name}"
        marker = ""
        if relative_path == current_task:
            marker = f" {colored('<- current', Colors.GREEN)}"

        # Children progress
        progress = children_progress(t.children, all_statuses)
        status_label = _display_status(t, all_statuses)

        # Package tag
        pkg_tag = f" @{t.package}" if t.package else ""

        prefix = "  " * indent + "  - "

        if filter_mine:
            print(f"{prefix}{dir_name}/ ({status_label}){pkg_tag}{progress}{marker}")
        else:
            print(f"{prefix}{dir_name}/ ({status_label}){pkg_tag}{progress} [{colored(t.assignee or '-', Colors.CYAN)}]{marker}")
        count += 1

        # Print children indented
        for child_name in t.children:
            if child_name in visible_tasks and visible_tasks[child_name].parent == dir_name:
                _print_task(child_name, indent + 1)

    # A matching child remains visible even when its parent was filtered out.
    for dir_name in sorted(visible_tasks):
        parent = visible_tasks[dir_name].parent
        if parent not in visible_tasks or dir_name not in visible_tasks[parent].children:
            _print_task(dir_name)

    if count == 0:
        if filter_mine:
            print("  (no tasks assigned to you)")
        else:
            print("  (no active tasks)")

    print()
    print(f"Total: {count} task(s)")
    return 0


# =============================================================================
# Command: list-archive
# =============================================================================

def cmd_list_archive(args: argparse.Namespace) -> int:
    """List archived tasks."""
    try:
        owner = resolve_owner()
    except TaskProtocolError as exc:
        print(colored(f"Error: {exc}", Colors.RED), file=sys.stderr)
        for key, value in exc.details.items():
            print(f"  {key}: {value}", file=sys.stderr)
        return 1
    tasks_dir = get_tasks_dir(owner)
    archive_dir = tasks_dir / "archive"
    month = args.month

    print(colored("Archived tasks:", Colors.BLUE))
    print()

    if month:
        month_dir = archive_dir / month
        if month_dir.is_dir():
            print(f"[{month}]")
            for d in sorted(month_dir.iterdir()):
                if d.is_dir():
                    print(f"  - {d.name}/")
        else:
            print(f"  No archives for {month}")
    else:
        if archive_dir.is_dir():
            for month_dir in sorted(archive_dir.iterdir()):
                if month_dir.is_dir():
                    month_name = month_dir.name
                    count = sum(1 for d in month_dir.iterdir() if d.is_dir())
                    print(f"[{month_name}] - {count} task(s)")

    return 0


# =============================================================================
# Help
# =============================================================================

def show_usage() -> None:
    """Show usage help."""
    print("""Task Management Script

Usage:
  python3 task.py create <title> --description <desc>  Create new task directory (both required, non-empty)
  python3 task.py create <title> --description <desc> --package <pkg>   Create task for a specific package
  python3 task.py create <title> --description <desc> --parent <dir>    Create task as child of parent
  python3 task.py create <title> --description <desc> --no-start        Create without making it active in this session
  python3 task.py add-context <dir> <jsonl> <path> [reason]  Add entry to jsonl
  python3 task.py validate <dir>                     Validate jsonl files
  python3 task.py list-context <dir>                 List jsonl entries
  python3 task.py start <dir>                        Set active task; records the checked-out branch when unset
  python3 task.py current [--source]                 Show active task
  python3 task.py finish                             Clear active task
  python3 task.py set-branch <dir> <branch>          Set git branch
  python3 task.py set-base-branch <dir> <branch>     Set PR target branch
  python3 task.py set-scope <dir> <scope>            Set scope for PR title
  python3 task.py set-meta <dir> <key> <value>       Set/overwrite a task metadata key
  python3 task.py rename <dir> <new-slug>            Rename task, identity fields and references
  python3 task.py archive <task-dir>                 Archive completed task
  python3 task.py add-subtask <parent> <child>       Link child task to parent
  python3 task.py remove-subtask <parent> <child>    Unlink child from parent
  python3 task.py list [--mine] [--status <status>] [--json]  List tasks
  python3 task.py list --closed [--json]             Closed view (in-place + legacy archive)
  python3 task.py show <id> [--json]                 Show one task by id, legacy id, dir, or path
  python3 task.py update <id> [options] [--expect-version <v>] [--json]
                                                     Update fields with stale-write protection
  python3 task.py complete <id> [--expect-version <v>] [--json]
                                                     Close in place (idempotent; path unchanged)
  python3 task.py migrate [--preview|--apply] [--json]
                                                     Preview/apply task schema v1 migration
  python3 task.py schema                             Print the task v1 JSON Schema
  python3 task.py list-archive [YYYY-MM]             List archived tasks

Protocol options:
  --expect-version <v>  Opaque version token from a previous read; rejects a
                        write when another process changed the record first.
  --next-action <text>  Short handoff rendered by resume-oriented readers.
  --label <label>       Task label (repeatable); update replaces the set.
  --extension k=JSON    Namespaced adapter metadata (e.g. com.example.board={"id":"42"}).
  --json                Machine-readable JSON on stdout; diagnostics stay on stderr.

Monorepo options:
  --package <pkg>      Package name (validated against config.yaml packages)

Rename options:
  --dry-run            Print the change set without writing anything

Archive options:
  --no-commit                Skip the auto git commit after archiving
  --skip-branch-validation   Archive despite missing or self-referential branch metadata.
                             Archive normally refuses a task with no `branch` when it has a
                             `base_branch` and the repo has a remote, or with
                             `branch == base_branch`; repair those with `set-branch` /
                             `set-base-branch` instead. Use this flag only for tasks that
                             were never PR-backed. A recorded branch that was merged and
                             deleted is only a warning and needs no flag.

List options:
  --mine, -m           Show only tasks assigned to current developer
  --status, -s <s>     Filter by status (planning, in_progress, review, completed)
  --json               Output machine-readable JSON (also available on `current`)

Examples:
  python3 task.py create "Add login feature" --description "Email + password sign-in" --slug add-login
  python3 task.py create "Add login feature" --description "Email + password sign-in" --slug add-login --package cli
  python3 task.py create "Add login feature" --description "Email + password sign-in" --meta linear=ENG-123 --meta epic=auth
  python3 task.py create "Child task" --description "Session cookie handling" --slug child --parent .memerig/tasks/01-21-parent
  python3 task.py add-context <dir> implement .memerig/spec/cli/backend/auth.md "Auth guidelines"
  python3 task.py set-branch <dir> task/add-login
  python3 task.py start .memerig/tasks/01-21-add-login
  python3 task.py current --source
  python3 task.py finish
  python3 task.py rename add-login add-sso --dry-run  # Preview the change set
  python3 task.py rename add-login add-sso
  python3 task.py archive add-login
  python3 task.py archive add-login --skip-branch-validation  # Task never had a branch of its own
  python3 task.py add-subtask parent-task child-task  # Link existing tasks
  python3 task.py remove-subtask parent-task child-task
  python3 task.py list                               # List all active tasks
  python3 task.py list --mine                        # List my tasks only
  python3 task.py list --mine --status in_progress   # List my in-progress tasks
""")


# =============================================================================
# Main Entry
# =============================================================================

def main() -> int:
    """CLI entry point."""
    # Deprecation guard: `init-context` was removed in v0.5.0-beta.12.
    # Detect early so argparse doesn't mask the real reason with a generic
    # "invalid choice" error.
    if len(sys.argv) >= 2 and sys.argv[1] == "init-context":
        print(
            colored(
                "Error: `task.py init-context` was removed in v0.5.0-beta.12.",
                Colors.RED,
            ),
            file=sys.stderr,
        )
        print(
            "implement.jsonl / check.jsonl are now seeded on `task.py create` for",
            file=sys.stderr,
        )
        print(
            "sub-agent-capable platforms and curated by the AI during planning when needed.",
            file=sys.stderr,
        )
        print("See .memerig/workflow.md planning artifact guidance or run:", file=sys.stderr)
        print(
            "  python3 ./.memerig/scripts/get_context.py --mode phase --step 1",
            file=sys.stderr,
        )
        print(
            "Use `task.py add-context <dir> implement|check <path> <reason>` to append entries.",
            file=sys.stderr,
        )
        return 2

    parser = argparse.ArgumentParser(
        description="Task Management Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # create
    p_create = subparsers.add_parser("create", help="Create new task")
    p_create.add_argument("title", help="Task title (required, non-empty)")
    p_create.add_argument("--slug", "-s", help="Task slug without the MM-DD date prefix")
    p_create.add_argument("--assignee", "-a", help="Assignee developer")
    p_create.add_argument("--priority", "-p", default="P2", help="Priority (P0-P3)")
    p_create.add_argument(
        "--description",
        "-d",
        help="Task description (required, non-empty — an empty one is refused at archive)",
    )
    p_create.add_argument("--parent", help="Parent task directory (establishes subtask link)")
    p_create.add_argument("--package", help="Package name for monorepo projects")
    p_create.add_argument(
        "--base-branch",
        help="PR target branch (overrides origin/HEAD detection and the checked-out-branch fallback)",
    )
    p_create.add_argument(
        "--meta",
        action="append",
        help="Task metadata key=value (repeatable)",
    )
    p_create.add_argument(
        "--label",
        action="append",
        help="Task label (repeatable)",
    )
    p_create.add_argument(
        "--next-action",
        help="Short handoff for the next session",
    )
    p_create.add_argument(
        "--extension",
        action="append",
        help="namespaced.key=JSON extension pair (repeatable)",
    )
    p_create.add_argument(
        "--json",
        action="store_true",
        help="Output a machine-readable task record (includes the version token)",
    )
    p_create.add_argument(
        "--no-start",
        action="store_true",
        help="Create the task without making it active in this session",
    )
    p_create.add_argument(
        "--force",
        action="store_true",
        help="Overwrite task.json when the task directory already exists",
    )

    # add-context
    p_add = subparsers.add_parser("add-context", help="Add context entry")
    p_add.add_argument("dir", help="Task directory")
    p_add.add_argument("file", help="JSONL file (implement|check)")
    p_add.add_argument("path", help="File path to add")
    p_add.add_argument("reason", nargs="?", help="Reason for adding")

    # validate
    p_validate = subparsers.add_parser("validate", help="Validate context files")
    p_validate.add_argument("dir", help="Task directory")

    # list-context
    p_listctx = subparsers.add_parser("list-context", help="List context entries")
    p_listctx.add_argument("dir", help="Task directory")

    # start
    p_start = subparsers.add_parser("start", help="Set active task")
    p_start.add_argument("dir", help="Task UUID, legacy id, name, or path")
    p_start.add_argument(
        "--allow-empty-context",
        action="store_true",
        help="Start even when implement.jsonl / check.jsonl have no curated entries",
    )

    # current
    p_current = subparsers.add_parser("current", help="Show active task")
    p_current.add_argument("--source", action="store_true",
                           help="Show active task source")
    p_current.add_argument("--json", action="store_true",
                           help="Output machine-readable JSON")

    # finish
    subparsers.add_parser("finish", help="Clear active task")

    # set-branch
    p_branch = subparsers.add_parser("set-branch", help="Set git branch")
    p_branch.add_argument("dir", help="Task directory")
    p_branch.add_argument("branch", help="Branch name")

    # set-base-branch
    p_base = subparsers.add_parser("set-base-branch", help="Set PR target branch")
    p_base.add_argument("dir", help="Task directory")
    p_base.add_argument("base_branch", help="Base branch name (PR target)")

    # set-scope
    p_scope = subparsers.add_parser("set-scope", help="Set scope")
    p_scope.add_argument("dir", help="Task directory")
    p_scope.add_argument("scope", help="Scope name")

    # set-meta
    p_setmeta = subparsers.add_parser("set-meta", help="Set/overwrite a task metadata key")
    p_setmeta.add_argument("dir", help="Task directory")
    p_setmeta.add_argument("key", help="Metadata key")
    p_setmeta.add_argument("value", help="Metadata value")

    # rename
    p_rename = subparsers.add_parser("rename", help="Rename task and its references")
    p_rename.add_argument("name", help="Task directory or name")
    p_rename.add_argument("new_slug", help="New slug without the MM-DD date prefix")
    p_rename.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the change set without writing anything",
    )

    # archive
    p_archive = subparsers.add_parser("archive", help="Archive task")
    p_archive.add_argument("name", help="Task directory or name")
    p_archive.add_argument("--no-commit", action="store_true", help="Skip auto git commit after archive")
    p_archive.add_argument(
        "--skip-branch-validation",
        action="store_true",
        help=(
            "Archive even when branch metadata is missing or self-referential "
            "(for tasks that were never PR-backed)"
        ),
    )

    # list
    p_list = subparsers.add_parser("list", help="List tasks")
    p_list.add_argument("--mine", "-m", action="store_true", help="My tasks only")
    p_list.add_argument("--status", "-s", help="Filter by status")
    p_list.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    p_list.add_argument(
        "--closed",
        action="store_true",
        help="Closed view: in-place completed/canceled tasks plus legacy archive/",
    )

    # show
    p_show = subparsers.add_parser("show", help="Show one task by id or legacy selector")
    p_show.add_argument("task", help="Task UUID, legacy id, dir name, or path")
    p_show.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    p_show.add_argument(
        "--active-only",
        action="store_true",
        help="Do not search legacy archive/ paths",
    )

    # update
    p_update = subparsers.add_parser("update", help="Update a task with a stale-write token")
    p_update.add_argument("task", help="Task UUID, legacy id, dir name, or path")
    p_update.add_argument("--title")
    p_update.add_argument("--description")
    p_update.add_argument("--status", help="planning|in_progress|review|completed|canceled (open/done aliases accepted)")
    p_update.add_argument("--assignee")
    p_update.add_argument("--priority")
    p_update.add_argument("--package")
    p_update.add_argument("--branch")
    p_update.add_argument("--base-branch")
    p_update.add_argument("--notes")
    p_update.add_argument("--next-action", help="Short handoff for the next session")
    p_update.add_argument("--clear-next-action", action="store_true")
    p_update.add_argument("--label", action="append", help="Replace labels with the given values (repeatable)")
    p_update.add_argument("--clear-labels", action="store_true")
    p_update.add_argument("--parent", help="Parent task selector")
    p_update.add_argument("--clear-parent", action="store_true")
    p_update.add_argument("--meta", action="append", help="KEY=VALUE metadata pair (repeatable)")
    p_update.add_argument("--extension", action="append", help="namespaced.key=JSON extension pair (repeatable)")
    p_update.add_argument("--expect-version", help="Opaque version token from a previous read")
    p_update.add_argument("--json", action="store_true")

    # complete
    p_complete = subparsers.add_parser("complete", help="Close a task in place (idempotent)")
    p_complete.add_argument("task", help="Task UUID, legacy id, dir name, or path")
    p_complete.add_argument("--expect-version", help="Opaque version token from a previous read")
    p_complete.add_argument("--json", action="store_true")

    # migrate
    p_migrate = subparsers.add_parser("migrate", help="Preview or apply task schema v1 migration")
    p_migrate.add_argument("--preview", action="store_true", help="Show the change set (default)")
    p_migrate.add_argument("--apply", action="store_true", help="Back up, then apply the change set")
    p_migrate.add_argument("--json", action="store_true")

    # schema
    p_schema = subparsers.add_parser("schema", help="Print the task v1 JSON Schema")
    p_schema.add_argument("--json", action="store_true")

    # add-subtask
    p_addsub = subparsers.add_parser("add-subtask", help="Link child task to parent")
    p_addsub.add_argument("parent_dir", help="Parent task directory")
    p_addsub.add_argument("child_dir", help="Child task directory")

    # remove-subtask
    p_rmsub = subparsers.add_parser("remove-subtask", help="Unlink child task from parent")
    p_rmsub.add_argument("parent_dir", help="Parent task directory")
    p_rmsub.add_argument("child_dir", help="Child task directory")

    # list-archive
    p_listarch = subparsers.add_parser("list-archive", help="List archived tasks")
    p_listarch.add_argument("month", nargs="?", help="Month (YYYY-MM)")

    args = parser.parse_args()

    if not args.command:
        show_usage()
        return 1

    commands = {
        "create": cmd_create,
        "add-context": cmd_add_context,
        "validate": cmd_validate,
        "list-context": cmd_list_context,
        "start": cmd_start,
        "current": cmd_current,
        "finish": cmd_finish,
        "set-branch": cmd_set_branch,
        "set-base-branch": cmd_set_base_branch,
        "set-scope": cmd_set_scope,
        "set-meta": cmd_set_meta,
        "rename": cmd_rename,
        "archive": cmd_archive,
        "add-subtask": cmd_add_subtask,
        "remove-subtask": cmd_remove_subtask,
        "list": cmd_list,
        "list-archive": cmd_list_archive,
        "show": cmd_show,
        "update": cmd_update,
        "complete": cmd_complete,
        "migrate": cmd_migrate,
        "schema": cmd_schema,
    }

    if args.command in commands:
        return commands[args.command](args)
    else:
        show_usage()
        return 1


if __name__ == "__main__":
    sys.exit(main())
