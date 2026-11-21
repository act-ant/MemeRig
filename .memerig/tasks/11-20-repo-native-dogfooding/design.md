# Design

The checked-in Python task runtime and project files are the primary interface for collaborators. MemeRig uses those files to manage its own work. Release tooling packages the same runtime and optional templates for maintainers. Project-local integrations consume that runtime and can be disabled.

[Task protocol](../11-20-repo-task-protocol/design.md) owns record semantics, migration, and repository scripts. [Starter templates](../11-20-starter-template-release/design.md) owns spec content, registry registration, and offline selection. [Project discovery](../11-20-lightweight-project-discovery/design.md) owns project resolution, task Git policy, and user-level metadata.

The blank initializer and optional presets share a common base file contract. The template child implements preset selection and content. The project-discovery child integrates the base config, hook defaults, and onboarding into the initializer; coordinate changes to the init entry point sequentially. The task-protocol child owns the task-store migration. Preserve custom generated files through existing update ownership rules.

Decisions proposed for review are standard-library Python, local task records as the source of truth, optional user-local discovery, and Git-reviewed changes in team repositories. External board-specific connectors and cross-device memory synchronization require separate product decisions. Game Dev source provenance is still open.
