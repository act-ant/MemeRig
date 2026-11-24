# Dependency governance

**Declaration.** Add, remove, or upgrade a dependency only with a recorded need, an approved scope, and enough license, security, and maintenance evidence for the dependency's reach.

## Applies to

- Adding a direct, optional, or peer dependency, or vendoring third-party code.
- Replacing standard-library or platform behavior with a package.
- Upgrading a dependency in a way that changes behavior, platform support, or transitive packages.
- Shipping build, test, or runtime tooling that other contributors must install.
- Accepting a transitive license, security, or maintenance risk that the project did not previously carry.

## Constraints

1. Reuse first. Check the standard library, platform facilities, and existing dependencies; record why they are insufficient rather than skipping the check.
2. State the purpose, the scope (runtime, build, test, optional), and the expected lifetime. Avoid a dependency for functionality that is trivial to keep local.
3. Verify that the license is compatible with distribution and deployment. An unknown or unlicensed package is blocked until an explicit review resolves it.
4. Check security advisories and maintenance health in proportion to the dependency's privilege and reach. Abandoned packages are a poor fit for critical paths.
5. Keep supply-chain risk visible: pin and lock versions, review install scripts and provenance, and avoid unreviewed tarball or URL dependencies.
6. Record who approves production dependency changes. If the project has no recorded approval path, a maintainer review is the minimum.
7. Keep the lockfile diff scoped to the intended change. Explain unexpected transitive additions instead of accepting them silently.
8. Remove unused dependencies and their configuration; do not leave dead packages behind.
9. For a major upgrade, review the changelog and migration notes, test the upgrade path, and keep a rollback option.
10. An emergency security update may be expedited, but the exception and its follow-up review must be recorded.

## Observable compliance

- The change states the need, alternatives considered, selected version, license, scope, and approver.
- License and security checks pass, or an explicit documented exception exists.
- The lockfile contains only the expected package changes; unexplained additions are called out.
- A major upgrade has migration notes, verification results, and a rollback path.
- Unused dependencies are removed together with their code and configuration.
- No unreviewed install script or unpinned remote artifact is introduced.

## Scope and conflicts

A security patch can conflict with a compatibility window: expedite the patch, but still decide and record the public-contract impact instead of silently breaking it. A one-off experiment may use a temporary dependency without full approval, but shipping it to the project does not inherit that exemption. If a project Spec has a stricter dependency policy, follow it or change it explicitly; this rule does not override it automatically.

## Provenance

Original MemeRig text. Inspired by the public discussion at <https://x.com/murong97358/status/2124531122826854873>; that post is commentary, no reuse license was established for it, and its author, token-expenditure, and incident claims were not independently verified. This document is not copied from it or from any third-party rule set.
