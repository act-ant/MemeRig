"""Local managed execution and delivery for the repository task store."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from uuid import uuid4

from . import task_protocol as protocol
from .file_lock import file_lock
from .active_task import _context_path
from .io import write_json

KEY = "memerig.execution"
LEASE_SECONDS = 60


def git(root, *args):
    result = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)
    if result.returncode:
        raise ValueError(result.stderr.strip() or "Git command failed")
    return result.stdout.strip()


RECEIPT_FIELDS = {
    "runs": ("runId", "outcome", "finishedAt", "sessions", "artifacts", "checks"),
    "reviews": ("reviewId", "runId", "decision", "reviewedAt", "reviewer", "commit", "checks"),
    "deliveries": ("deliveryId", "runId", "reviewId", "reviewedCommit", "commit", "target", "deliveredAt"),
}
ARRAY_FIELDS = {"sessions", "artifacts", "checks"}
OUTCOMES = ("succeeded", "failed", "interrupted")
DECISIONS = ("approved", "rejected")


def receipt_schema(kind):
    fields = RECEIPT_FIELDS[kind]
    properties = {field: {"type": "array" if field in ARRAY_FIELDS else "string"} for field in fields}
    properties.update(schemaVersion={"const": 1}, taskId={"type": "string"})
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object", "required": list(properties), "properties": properties,
    }
    if kind == "runs":
        properties["outcome"]["enum"] = list(OUTCOMES)
        schema.update({"if": {"properties": {"outcome": {"const": "succeeded"}}},
                       "then": {"required": ["commit"], "properties": {"commit": {"type": "string"}}}})
    elif kind == "reviews":
        properties["decision"]["enum"] = list(DECISIONS)
    return schema


def validate_receipt(path, record):
    kind = path.parent.name
    fields = RECEIPT_FIELDS.get(kind)
    if fields is None:
        return
    task = json.loads((path.parent.parent / "task.json").read_text(encoding="utf-8"))
    if (
        not isinstance(record, dict) or record.get("schemaVersion") != 1
        or record.get("taskId") != task.get("id") or record.get(fields[0]) != path.stem
        or any(not isinstance(record.get(field), list if field in ARRAY_FIELDS else str) for field in fields)
        or (kind == "runs" and record.get("outcome") not in OUTCOMES)
        or (kind == "runs" and record.get("outcome") == "succeeded" and not isinstance(record.get("commit"), str))
        or (kind == "reviews" and record.get("decision") not in DECISIONS)
    ):
        raise ValueError(f"Invalid {kind} receipt: {path}")


def save(path, record):
    validate_receipt(path, record)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not write_json(path, record):
        raise OSError(f"Could not persist {path}")


def load(path):
    record = json.loads(path.read_text(encoding="utf-8"))
    validate_receipt(path, record)
    return record


def state(location):
    return location.data.get("extensions", {}).get(KEY)


def update(location, execution, status):
    record = dict(location.data)
    record["extensions"] = {**record.get("extensions", {}), KEY: execution}
    record["status"] = status
    stamp = protocol.utc_now()
    record["updatedAt"] = stamp
    if status == "completed":
        record.update(closedAt=stamp, completedAt=stamp)
    protocol.write_record_file(location.directory, record)


def locate(owner, selector):
    return protocol._select_location(
        protocol.scan_task_locations(protocol.tasks_root_for(owner), owner, include_archive=False),
        selector, owner,
    )


def lock(owner):
    return file_lock(protocol.lock_path_for(protocol.tasks_root_for(owner)))


def receipt(directory, kind, identifier):
    from uuid import UUID

    if str(UUID(identifier)) != identifier:
        raise ValueError("Invalid receipt ID")
    return directory / kind / f"{identifier}.json"


def recover(location, claim_path):
    execution = state(location)
    if not execution or not execution.get("activeRunId"):
        if claim_path.exists():
            claim = load(claim_path)
            receipt(location.directory, "runs", claim["runId"])
            _context_path(claim_path.parents[3], claim["runId"]).unlink(missing_ok=True)
            claim_path.unlink()
        return
    run_id = execution["activeRunId"]
    path = receipt(location.directory, "runs", run_id)
    claim = load(claim_path) if claim_path.exists() else None
    if not path.exists():
        if claim and claim["runId"] == run_id and claim["leaseExpiresAt"] > time.time():
            raise ValueError("Task already has an active execution")
        save(path, {
            "schemaVersion": 1, "taskId": location.data["id"], "runId": run_id,
            "outcome": "interrupted", "startedAt": claim["startedAt"] if claim else None,
            "finishedAt": protocol.utc_now(), "sessions": claim["sessions"] if claim else [],
            "commit": None,
            "artifacts": claim.get("artifacts", []) if claim else [],
            "checks": list(claim.get("checks", {}).values()) if claim else [],
            "progress": claim.get("progress", []) if claim else [],
        })
    run = load(path)
    candidate = run_id if run["outcome"] == "succeeded" else None
    update(location, {"candidateRunId": candidate}, "review" if candidate else "in_progress")
    claim_path.unlink(missing_ok=True)
    _context_path(claim_path.parents[3], run_id).unlink(missing_ok=True)


def execute(owner, selector, command):
    if not command:
        raise ValueError("An execution command is required")
    run_id = str(uuid4())
    task_id = None
    runtime = owner / ".memerig" / ".runtime"
    worktree = owner / ".memerig" / "worktrees" / run_id
    base = git(owner, "rev-parse", "HEAD")
    started = protocol.utc_now()
    sessions = [{"provider": Path(command[0]).name, "role": "implementation"}]
    with lock(owner):
        location = locate(owner, selector)
        task_id = location.data["id"]
        claim_path = receipt(runtime, "claims", task_id)
        recover(location, claim_path)
        location = locate(owner, task_id)
        if location.closed:
            raise ValueError("Cannot execute a closed task")
        claim = {"taskId": task_id, "runId": run_id, "contextId": run_id,
                 "startedAt": started, "sessions": sessions,
                 "worktree": str(worktree), "leaseExpiresAt": time.time() + LEASE_SECONDS}
        save(claim_path, claim)
        update(location, {"activeRunId": run_id}, "in_progress")
        save(_context_path(owner, run_id), {
            "current_task": location.relative_path, "current_run": run_id,
            "platform": sessions[0]["provider"], "last_seen_at": started,
        })

    environment = {**os.environ, "MEMERIG_CONTEXT_ID": run_id, "MEMERIG_TASK_OWNER": str(owner),
                   "MEMERIG_TASK_ID": task_id, "MEMERIG_RUN_ID": run_id}
    process = None
    commit = None
    error = None
    code = 1
    try:
        worktree.parent.mkdir(parents=True, exist_ok=True)
        # Git setup runs under the same renewable lease as the agent command.
        for argv, cwd in (
            (["git", "worktree", "add", "-b", f"memerig/run/{run_id}", str(worktree), base], owner),
            (command, worktree),
        ):
            process = subprocess.Popen(argv, cwd=cwd, env=environment)
            while True:
                try:
                    code = process.wait(timeout=LEASE_SECONDS / 4)
                    break
                except subprocess.TimeoutExpired:
                    with lock(owner):
                        current = load(claim_path)
                        if current["runId"] != run_id or current["leaseExpiresAt"] <= time.time():
                            raise ValueError("Execution lease lost")
                        current["leaseExpiresAt"] = time.time() + LEASE_SECONDS
                        save(claim_path, current)
            if code:
                break
        if code == 0:
            commit = git(worktree, "rev-parse", "HEAD")
            if commit == base or git(worktree, "status", "--porcelain"):
                raise ValueError("Execution must leave a committed delivery and a clean worktree")
    except (OSError, ValueError, KeyboardInterrupt) as exc:
        error = str(exc) or type(exc).__name__
        code = 1
    finally:
        if process is not None and process.poll() is None:
            process.kill()
            process.wait()

    with lock(owner):
        location = locate(owner, task_id)
        current = load(claim_path)
        if current["runId"] != run_id or current["leaseExpiresAt"] <= time.time():
            raise ValueError("Execution lease lost before settlement")
        record = {
            "schemaVersion": 1, "taskId": task_id, "runId": run_id, "startedAt": started,
            "finishedAt": protocol.utc_now(), "sessions": current["sessions"], "exitCode": code,
            "outcome": "succeeded" if code == 0 else "failed", "commit": commit,
            "baseCommit": base,
            "artifacts": current.get("artifacts", []),
            "checks": list(current.get("checks", {}).values()),
            "progress": current.get("progress", []), "error": error,
        }
        save(receipt(location.directory, "runs", run_id), record)
        recover(location, claim_path)
    print(json.dumps(record))
    return 0 if code == 0 else 1


def review(owner, args):
    with lock(owner):
        location = locate(owner, args.task)
        execution = state(location)
        if location.closed or not execution or execution.get("candidateRunId") != args.run:
            raise ValueError("Run is not the current review candidate")
        run = load(receipt(location.directory, "runs", args.run))
        checks = []
        for item in args.check:
            name, separator, status = item.rpartition("=")
            if not separator or not name or status not in {"passed", "failed", "not_run"}:
                raise ValueError("Use --check NAME=passed|failed|not_run")
            checks.append({"name": name, "status": status})
        required_checks = location.data.get("meta", {}).get("requiredChecks", "")
        if not isinstance(required_checks, str):
            raise ValueError("meta.requiredChecks must be a comma-separated string")
        required = {name.strip() for name in required_checks.split(",") if name.strip()}
        passed = {check["name"] for check in checks if check["status"] == "passed"}
        if args.decision == "approved" and (
            not passed or not required.issubset(passed) or any(c["status"] != "passed" for c in checks)
        ):
            raise ValueError("Approval requires passing evidence for every required check")
        review_id = str(uuid4())
        record = {"schemaVersion": 1, "taskId": location.data["id"], "runId": args.run,
                  "reviewId": review_id, "reviewer": args.reviewer, "decision": args.decision,
                  "commit": run["commit"], "checks": checks, "evidence": args.evidence,
                  "reviewedAt": protocol.utc_now()}
        save(receipt(location.directory, "reviews", review_id), record)
        update(location, {**execution, "reviewId": review_id}, "review")
        print(json.dumps(record))
    return 0


def deliver(owner, args):
    with lock(owner):
        location = locate(owner, args.task)
        execution = state(location)
        if location.status == "completed" and execution and execution.get("deliveryId"):
            protocol.clear_task_from_sessions(location.relative_path, owner)
            return 0
        if location.closed or not execution or not execution.get("reviewId"):
            raise ValueError("Task has no pending approved delivery")
        run_id = execution["candidateRunId"]
        record = load(receipt(location.directory, "reviews", execution["reviewId"]))
        if record["runId"] != run_id or record["decision"] != "approved":
            raise ValueError("Current execution has not been approved")
        run = load(receipt(location.directory, "runs", run_id))
        required_checks = location.data.get("meta", {}).get("requiredChecks", "")
        if not isinstance(required_checks, str):
            raise ValueError("meta.requiredChecks must be a comma-separated string")
        required = {name.strip() for name in required_checks.split(",") if name.strip()}
        checks = record["checks"]
        if (run["outcome"] != "succeeded" or run["commit"] != record["commit"] or not checks
                or any(not isinstance(check, dict) or check.get("status") != "passed"
                       or not isinstance(check.get("name"), str) for check in checks)
                or not required.issubset({check["name"] for check in checks})):
            raise ValueError("Review no longer covers the current candidate and required checks")
        if args.artifact_file:
            return deliver_document(owner, location, execution, record, run, args)
        target = location.data.get("base_branch")
        if not target:
            raise ValueError("Task must declare its target branch")
        commit = record["commit"]
        target_head = git(owner, "rev-parse", "--verify", f"refs/heads/{target}^{{commit}}")
        landed = commit
        if args.landed_commit:
            landed = git(owner, "rev-parse", "--verify", "--end-of-options", args.landed_commit + "^{commit}")
            run = load(receipt(location.directory, "runs", run_id))
            options = ("diff", "--raw", "--no-abbrev", "--no-renames")
            reviewed = git(owner, *options, run["baseCommit"], commit)
            if not reviewed or reviewed != git(owner, *options, landed + "^", landed):
                raise ValueError("Landed commit does not preserve the reviewed file changes")
        git(owner, "merge-base", "--is-ancestor", landed, target_head)
        delivery_id = run_id
        path = receipt(location.directory, "deliveries", delivery_id)
        if not path.exists():
            save(path, {"schemaVersion": 1, "taskId": location.data["id"], "runId": run_id,
                        "deliveryId": delivery_id, "reviewId": execution["reviewId"],
                        "reviewedCommit": commit, "commit": landed, "target": target,
                        "targetHead": target_head, "deliveredAt": protocol.utc_now()})
        update(location, {**execution, "deliveryId": delivery_id}, "completed")
        protocol.clear_task_from_sessions(location.relative_path, owner)
    worktree = owner / ".memerig" / "worktrees" / run_id
    if worktree.is_dir():
        try:
            head = git(worktree, "rev-parse", "HEAD")
            git(owner, "merge-base", "--is-ancestor", head, target_head)
            git(owner, "worktree", "remove", str(worktree))
        except ValueError as exc:
            print(f"Preserving worktree: {exc}", file=sys.stderr)
    return 0


def deliver_document(owner, location, execution, review, run, args):
    if args.landed_commit or not args.artifact_path or not args.artifact_ref:
        raise ValueError("External delivery requires --artifact-path and --artifact-ref")
    reference = args.artifact_ref
    relative = args.artifact_path
    if relative not in run["artifacts"] or Path(relative).is_absolute() or ".." in Path(relative).parts:
        raise ValueError("Artifact path must be registered by the reviewed run")
    reviewed_blob = git(owner, "rev-parse", "--verify", f"{review['commit']}:{relative}")
    actual_blob = git(owner, "hash-object", "--no-filters", "--", str(Path(args.artifact_file).resolve()))
    if actual_blob != reviewed_blob:
        raise ValueError("External document differs from the reviewed artifact")
    run_id = run["runId"]
    path = receipt(location.directory, "deliveries", run_id)
    evidence = {"schemaVersion": 1, "taskId": location.task_id, "runId": run_id,
                "deliveryId": run_id, "reviewId": execution["reviewId"],
                "reviewedCommit": review["commit"], "commit": review["commit"],
                "target": reference, "artifactPath": relative, "artifactBlob": actual_blob}
    if path.exists():
        existing = load(path)
        if any(existing.get(key) != value for key, value in evidence.items()):
            raise ValueError("Existing delivery receipt does not match this document")
    else:
        save(path, {**evidence, "deliveredAt": protocol.utc_now()})
    update(location, {**execution, "deliveryId": run_id}, "completed")
    protocol.clear_task_from_sessions(location.relative_path, owner)
    return 0


def record_session(owner, args):
    task_id = os.environ.get("MEMERIG_TASK_ID", "")
    run_id = os.environ.get("MEMERIG_RUN_ID", "")
    runtime = owner / ".memerig" / ".runtime"
    with lock(owner):
        location = locate(owner, task_id)
        path = receipt(runtime, "claims", task_id)
        claim = load(path)
        if claim["runId"] != run_id or claim["leaseExpiresAt"] <= time.time():
            raise ValueError("Execution lease lost")
        if args.action == "session":
            session = {"provider": args.provider, "ref": args.ref, "role": args.role}
            if session not in claim["sessions"]:
                claim["sessions"].append(session)
        elif args.kind == "check":
            name, separator, status = args.value.rpartition("=")
            if not separator or not name or status not in {"passed", "failed", "not_run"}:
                raise ValueError("Use NAME=passed|failed|not_run")
            claim.setdefault("checks", {})[name] = {"name": name, "status": status}
        else:
            key = "artifacts" if args.kind == "artifact" else "progress"
            values = claim.setdefault(key, [])
            if args.value not in values:
                values.append(args.value)
        save(path, claim)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(prog="task.py execution")
    commands = parser.add_subparsers(dest="action", required=True)
    run = commands.add_parser("run")
    run.add_argument("task")
    run.add_argument("command", nargs=argparse.REMAINDER)
    check = commands.add_parser("review")
    check.add_argument("task")
    check.add_argument("run")
    check.add_argument("--decision", choices=["approved", "rejected"], required=True)
    check.add_argument("--reviewer", required=True)
    check.add_argument("--evidence", required=True)
    check.add_argument("--check", action="append", default=[])
    close = commands.add_parser("deliver")
    close.add_argument("task")
    close.add_argument("--landed-commit", help="Equivalent rewritten delivery commit")
    close.add_argument("--artifact-file", help="Published document file to verify")
    close.add_argument("--artifact-path", help="Registered path in the reviewed commit")
    close.add_argument("--artifact-ref", help="Stable publication reference for the receipt")
    retry = commands.add_parser("recover")
    retry.add_argument("task")
    session = commands.add_parser("session")
    session.add_argument("provider")
    session.add_argument("ref")
    session.add_argument("--role", choices=["implementation", "subagent"], required=True)
    evidence = commands.add_parser("evidence")
    evidence.add_argument("kind", choices=["check", "artifact", "progress"])
    evidence.add_argument("value")
    schema = commands.add_parser("schema")
    schema.add_argument("kind", choices=tuple(RECEIPT_FIELDS))
    args = parser.parse_args(argv)
    if args.action == "schema":
        print(json.dumps(receipt_schema(args.kind), indent=2))
        return 0
    try:
        owner = protocol.resolve_owner()
        if args.action in {"session", "evidence"}:
            owner = Path(os.environ.get("MEMERIG_TASK_OWNER", str(owner))).resolve()
            if git(Path.cwd(), "rev-parse", "--path-format=absolute", "--git-common-dir") != git(
                owner, "rev-parse", "--path-format=absolute", "--git-common-dir"
            ):
                raise ValueError("Execution directory and task owner belong to different repositories")
            return record_session(owner, args)
        if args.action == "run":
            command = args.command
            return execute(owner, args.task, command[1:] if command[:1] == ["--"] else command)
        if args.action == "review":
            return review(owner, args)
        if args.action == "recover":
            with lock(owner):
                location = locate(owner, args.task)
                runtime = owner / ".memerig" / ".runtime"
                recover(location, receipt(runtime, "claims", location.data["id"]))
            return 0
        return deliver(owner, args)
    except (OSError, ValueError, protocol.TaskProtocolError) as exc:
        print(f"Execution error: {exc}", file=sys.stderr)
        return 1
