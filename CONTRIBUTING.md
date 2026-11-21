# Contributing to MemeRig

Thanks for your interest in contributing to MemeRig! This document provides guidelines for contributing to the project.

## Ways to Contribute

### Reporting Bugs

Before creating a bug report, please check [existing issues](https://github.com/blackplume233/MemeRig/issues) to avoid duplicates.

When reporting a bug, include:
- MemeRig version (`memerig --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or screenshots

### Suggesting Features

Feature requests are welcome! Please open an issue with:
- Clear description of the feature
- Use case / problem it solves
- Any implementation ideas (optional)

### Improving Documentation

Documentation improvements are always appreciated:
- Fix typos or unclear explanations
- Add examples
- Improve README or guide docs

### Contributing Code

Code contributions are welcome for:
- Bug fixes
- New features (please discuss in an issue first)
- Performance improvements
- Test coverage

## Development Setup

### Work on a task from a fresh clone

The repository includes the task tools. Python 3.9+ is enough for task work. Use `python3` if that is how your system names Python 3.

```bash
python .memerig/scripts/task.py list
python .memerig/scripts/task.py create "Improve the setup guide" --description "Document offline setup" --json
python .memerig/scripts/task.py show <task-id> --json
python .memerig/scripts/task.py start <task-id>
python .memerig/scripts/task.py complete <task-id>
```

Use `prd.md` to record requirements and verification. Share work through Git review of the task directory. The task stays at the same path after completion. For programmatic clients, `task.py schema --json` prints the record schema. Use the version token from `show --json` with `update --expect-version` to reject stale writes.

Maintainers can run `memerig init --tasks tracked` to set up another shared project. Plain `memerig init` installs the blank configuration with local-only tasks. Select a platform by flag when the team uses it. See the [Marketplace publishing and adoption guide](marketplace/README.md) for offline presets and pinned Git versions.

```bash
python .memerig/scripts/project.py doctor
python .memerig/scripts/project.py configure --tasks tracked
python .memerig/scripts/project.py register
python .memerig/scripts/project.py list
```

The first registration creates `~/.memerig/projects.json` with a local user ID and a map of registered checkout paths by project ID. Task and session content stays in the original storage. `memerig mem projects --registered` groups the session counts for those checkouts. A submodule can set `task_owner: parent` in its own `.memerig/config.yaml` and invoke the parent task script from the module directory.

### Prerequisites

- Node.js 18.0.0+
- pnpm
- Python 3 (for hooks)
- Bash (for scripts)

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/MemeRig.git
   cd MemeRig
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

### Running Checks

```bash
pnpm lint        # ESLint for TypeScript
pnpm lint:py     # Type checking for Python (basedpyright)
pnpm lint:all    # Run both
pnpm typecheck   # TypeScript type checking
```

> **Note:** Pre-commit hooks will automatically run `eslint --fix` and `prettier --write` on staged `.ts` files.

## Project Structure

```
MemeRig/
├── src/                    # TypeScript source code
│   ├── cli/                # CLI entry point
│   ├── commands/           # CLI commands (init, update)
│   ├── configurators/      # Template application logic
│   ├── templates/          # Templates copied to user projects ←
│   └── utils/              # Utility functions
├── .claude/                # Claude Code config (project's own) ←
│   ├── agents/             # Agent definitions
│   ├── commands/           # Slash commands
│   └── hooks/              # Python hook scripts
├── .memerig/               # MemeRig workflow (project's own) ←
│   ├── scripts/            # Bash scripts
│   └── spec/               # Spec file templates
└── docs/                   # Documentation
```

> **Important:** When modifying `.claude/`, `.memerig/`, or `.cursor/`, check if the same changes need to be applied to `src/templates/`. The project uses its own config files, but templates are what gets installed to user projects.

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(cli): add --dry-run flag to init command
fix(hooks): resolve context injection for nested tasks
docs(readme): update quick start instructions
```

## Pull Request Process

1. **Create a branch** from `main`
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** and commit following the commit guidelines

3. **Ensure quality checks pass**
   ```bash
   pnpm lint && pnpm typecheck
   ```

4. **Push to your fork**
   ```bash
   git push origin feat/your-feature-name
   ```

5. **Open a Pull Request** against `main` branch
   - Provide a clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes

6. **Address review feedback** if requested

## Thank You

Every contribution helps make MemeRig better. We appreciate your time and effort!
