"""Resolve project ownership and maintain the opt-in local project catalog."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from subprocess import CalledProcessError, check_output
from uuid import UUID, uuid4

from .file_lock import file_lock
from .io import write_text_atomic
from .memerig_config import CONFIG_REL_PATH, parse_simple_yaml


def configure_project(root: Path, policy: str | None, *, fresh: bool = False) -> list[str]:
    """Assign a durable project ID and apply an explicit task Git policy."""
    root = root.resolve()
    config_path = root / CONFIG_REL_PATH
    with file_lock(root / ".memerig" / ".runtime" / "project-config.lock"):
        content = config_path.read_text(encoding="utf-8")
        config = parse_simple_yaml(content, source=str(config_path))
        if config.get("task_owner") == "parent":
            raise ValueError("Configure task policy at the owning project")
        project_id = _identifier(config.get("project_id"))
        task_settings = config.get("tasks", {})
        if not isinstance(task_settings, dict):
            raise ValueError("tasks must be a mapping")
        if policy is None and fresh:
            policy = "local"
        if policy is not None and policy not in ("local", "tracked"):
            raise ValueError("tasks.version_control must be local or tracked")
        tracked: list[str] = []
        if policy == "local" and (root / ".git").exists():
            try:
                output = check_output(["git", "ls-files", "-z", "--", ".memerig/tasks"], cwd=root)
            except (CalledProcessError, FileNotFoundError) as error:
                raise ValueError("Cannot inspect tracked task files. Run from a Git checkout.") from error
            tracked = [part for part in output.decode("utf-8").split("\0") if part]

        lines = content.splitlines()
        if project_id is None:
            lines.insert(0, f"project_id: {uuid4()}")
        if policy is not None:
            _set_task_policy(lines, policy)
            ignore = root / ".memerig" / ".gitignore"
            try:
                ignore_content = ignore.read_text(encoding="utf-8")
            except FileNotFoundError:
                ignore_content = ""
            ignore_lines = ignore_content.splitlines()
            # Git treats trailing hashes literally, so mark the managed block separately.
            marker = "# MemeRig local-only tasks"
            if marker in ignore_lines:
                index = ignore_lines.index(marker)
                if ignore_lines[index + 1:index + 2] != ["/tasks/"]:
                    raise ValueError(f"Managed task ignore rule was edited: {ignore}")
                del ignore_lines[index:index + 2]
            if policy == "local":
                ignore_lines.extend([marker, "/tasks/"])
            ignore_new = "\n".join(ignore_lines) + ("\n" if ignore_lines else "")
            if ignore_new != ignore_content and not write_text_atomic(ignore, ignore_new):
                raise OSError(f"Could not write {ignore}")
        new_content = "\n".join(lines) + "\n"
        if new_content != content and not write_text_atomic(config_path, new_content):
            raise OSError(f"Could not write {config_path}")
    return tracked


def _set_task_policy(lines: list[str], policy: str) -> None:
    task_key = next((i for i, line in enumerate(lines) if line.startswith("tasks:")), None)
    if task_key is None:
        lines.extend(["", "tasks:", f"  version_control: {policy}"])
        return
    if not re.fullmatch(r"tasks:\s*(?:#.*)?", lines[task_key]):
        raise ValueError("tasks must use a block mapping in config.yaml")
    indent = None
    for i in range(task_key + 1, len(lines)):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line[0].isspace():
            break
        if indent is None:
            indent = line[:len(line) - len(line.lstrip())]
        if line.startswith(indent + "version_control:"):
            comment = re.search(r"\s+#.*$", line)
            lines[i] = f"{indent}version_control: {policy}" + (comment.group() if comment else "")
            return
    lines.insert(task_key + 1, f"{indent or '  '}version_control: {policy}")


class ProjectConfigNotFound(ValueError):
    """No project config exists within the current Git boundary."""


@dataclass(frozen=True)
class Project:
    root: Path
    owner: Path
    project_id: str | None
    task_policy: str


def _nearest_config(start: Path) -> Path | None:
    for directory in (start, *start.parents):
        if (directory / CONFIG_REL_PATH).is_file():
            return directory
        if (directory / ".git").exists():
            break
    return None


def _read_config(root: Path) -> dict:
    file = root / CONFIG_REL_PATH
    return parse_simple_yaml(file.read_text(encoding="utf-8"), source=str(file))


def _identifier(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or str(UUID(value)) != value:
        raise ValueError("project_id must be a canonical UUID")
    return value


def resolve_project(start: Path) -> Project:
    """Resolve the closest config and the owner of its task store."""
    start = start.resolve()
    root = _nearest_config(start)
    if root is None:
        raise ProjectConfigNotFound(f"No {CONFIG_REL_PATH} within the project boundary: {start}")
    owner = root
    config = _read_config(root)
    if config.get("task_owner") == "parent":
        owner = _nearest_config(root.parent)
        if owner is None:
            raise ValueError(f"No parent project config for {root}")
        config = _read_config(owner)
        if config.get("task_owner") == "parent":
            raise ValueError(f"Parent task owner must own its task store: {owner}")
    if config.get("task_owner", "self") != "self":
        raise ValueError(f"task_owner must be self or parent: {owner}")
    tasks = config.get("tasks", {})
    if not isinstance(tasks, dict):
        raise ValueError(f"tasks must be a mapping: {owner}")
    policy = tasks.get("version_control", "tracked")
    if policy not in ("local", "tracked"):
        raise ValueError(f"tasks.version_control must be local or tracked: {owner}")
    return Project(root, owner, _identifier(config.get("project_id")), policy)


class Catalog:
    """Local index of registered checkouts. Reads never create user state."""

    def __init__(self) -> None:
        self.path = Path.home() / ".memerig" / "projects.json"

    def _read(self) -> dict:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return {"schemaVersion": 1, "userId": None, "projects": {}}
        if not isinstance(data, dict) or data.get("schemaVersion") != 1:
            raise ValueError(f"Unsupported project catalog: {self.path}")
        if not _identifier(data.get("userId")) or not isinstance(data.get("projects"), dict):
            raise ValueError(f"Invalid project catalog: {self.path}")
        for project_id, checkouts in data["projects"].items():
            if not _identifier(project_id) or not isinstance(checkouts, list) or not all(
                isinstance(p, str) and Path(p).is_absolute() for p in checkouts
            ):
                raise ValueError(f"Invalid checkout in project catalog: {self.path}")
        return data

    def _write(self, data: dict) -> None:
        if not write_text_atomic(self.path, json.dumps(data, indent=2, ensure_ascii=False) + "\n"):
            raise OSError(f"Could not write {self.path}")

    def register(self, project: Project) -> None:
        if project.project_id is None:
            raise ValueError(f"Set project_id in {project.owner / CONFIG_REL_PATH} before registering")
        with file_lock(self.path.with_suffix(".lock")):
            data = self._read()
            if data["userId"] is None:
                data["userId"] = str(uuid4())
            self._remove(data, project.owner)
            checkouts = data["projects"].setdefault(project.project_id, [])
            checkouts.append(str(project.owner))
            checkouts.sort()
            self._write(data)

    @staticmethod
    def _remove(data: dict, checkout: Path) -> bool:
        projects = data["projects"]
        changed = False
        for project_id, checkouts in list(projects.items()):
            remaining = [p for p in checkouts if Path(p) != checkout]
            if len(remaining) != len(checkouts):
                changed = True
                if remaining:
                    projects[project_id] = remaining
                else:
                    del projects[project_id]
        return changed

    def unregister(self, checkout: Path) -> None:
        if not self.path.is_file():
            return
        with file_lock(self.path.with_suffix(".lock")):
            data = self._read()
            if self._remove(data, checkout.resolve()):
                self._write(data)

    def inspect(self) -> dict:
        data = self._read()
        valid: dict[str, list[str]] = {}
        stale: dict[str, list[str]] = {}
        for project_id, checkouts in data["projects"].items():
            for checkout in checkouts:
                path = Path(checkout)
                try:
                    project = resolve_project(path)
                    matches = project.owner == path and project.project_id == project_id
                except (OSError, ValueError):
                    matches = False
                (valid if matches else stale).setdefault(project_id, []).append(checkout)
        return {"schemaVersion": 1, "userId": data["userId"], "projects": valid, "stale": stale}
