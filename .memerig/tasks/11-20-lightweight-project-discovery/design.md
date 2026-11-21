# Design

Project setup stores an immutable `project_id` in checked-in `.memerig/config.yaml`. Cross-project discovery is opt-in through explicitly registering a checkout. A local catalog such as `~/.memerig/projects.json` stores a version, a random installation ID, and a mapping from project ID to canonical local checkout paths. It supports adding and removing checkouts and reports stale entries. Check the project ID at a registered path before using it. Shared task assignments use project account handles. The catalog does not store task or session content.

Use the nearest project config within the Git boundary. A submodule can either declare independent ownership with its own ID or explicitly name the parent as task owner and override only documented module settings. Diagnostics report the task store owner, sources used to resolve configuration, and selected task Git policy. When the parent is unavailable, report the missing owner with instructions for resolving it.

Provide `tasks.version_control: local | tracked`. In local mode, the installer maintains an explicit task ignore entry. A switch to local reports any tracked paths before changing the ignore policy, and the maintainer controls the Git change. Migration observes the existing index and ignore behavior. Runtime and personal state use separate ignored paths regardless of task mode.

The fresh default installs the minimum files required for repository-local use and skips onboarding tasks and platform hooks. When optional integration is enabled, a hook is a read-only adapter for context and can use the same script as collaborators. The task protocol remains the lifecycle mechanism, with explicit ID operations and ordinary Python invocation.
