#!/usr/bin/env python3
"""Inspect local project configuration and manage optional cross-project discovery."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common.memerig_config import CONFIG_REL_PATH
from common.project import Catalog, configure_project, resolve_project


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("doctor", "register", "unregister"):
        command = commands.add_parser(name)
        command.add_argument("path", nargs="?", type=Path, default=Path.cwd())
    setup = commands.add_parser("configure", help="Set a project ID and task Git policy")
    setup.add_argument("--tasks", choices=("local", "tracked"))
    setup.add_argument("--new", action="store_true", help=argparse.SUPPRESS)
    commands.add_parser("list", help="List registered project IDs, checkouts, and stale paths")
    args = parser.parse_args()
    catalog = Catalog()
    try:
        if args.command == "list":
            result = catalog.inspect()
        elif args.command == "unregister":
            catalog.unregister(args.path)
            result = catalog.inspect()
        elif args.command == "configure":
            tracked = configure_project(Path.cwd(), args.tasks, fresh=args.new)
            result = {"stillTracked": tracked}
            if tracked:
                print("The following tasks remain tracked. Review them in Git before changing the index:", file=sys.stderr)
                print("\n".join(tracked), file=sys.stderr)
        else:
            project = resolve_project(args.path)
            if args.command == "register":
                catalog.register(project)
            result = {
                "projectId": project.project_id,
                "config": str(project.root / CONFIG_REL_PATH),
                "ownerConfig": str(project.owner / CONFIG_REL_PATH),
                "taskStore": str(project.owner / ".memerig" / "tasks"),
                "taskVersionControl": project.task_policy,
            }
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (OSError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
