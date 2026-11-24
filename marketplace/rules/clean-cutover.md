# Clean cutover

**Declaration.** Retire replaced code and compatibility shims only after the change explicitly names the interface being removed, migrates every known consumer, and preserves a recovery path. Clean cutover is a scoped engineering decision, not authorization for unrelated churn or destructive data changes.

## Applies to

- Replacing an internal module, helper, command, flag, configuration key, schema, or protocol.
- Removing an alias, adapter, dual-write path, or other compatibility shim after a migration.
- Reviewing a change that argues an old path is unused.
- A side project that wants to drop an old implementation; the scope and safety constraints still apply.

## Constraints

1. Name each retired interface precisely: file, symbol, command, flag, field, route, event, or schema. "Remove the old system" is not an acceptable scope.
2. Find and migrate known consumers before or with the removal. An in-repo search is evidence about this repository only; it does not prove that external users, scripts, cached clients, or persisted records are unaffected.
3. Do not infer permission to delete stored data, drop columns or tables, discard files, or omit a migration. Data removal needs its own explicit decision, backup and restore path, and verification.
4. Do not infer permission to break a published API, protocol, supported file format, or documented behavior. That part requires an explicit compatibility decision from the optional `production-compatibility` rule.
5. Side-project status is not blanket authorization. A smaller project may choose a shorter migration path, but user data, backups, and promises made to other people still need explicit handling.
6. Remove a compatibility shim only after the replacement has been exercised through its nearest real entry point. Keep the removal reversible until the migration is verified.
7. Do not delete user-authored files, generated artifacts with unclear ownership, or unrelated dead code as part of the cutover.

## Observable compliance

- The task or pull request names every retired interface, its replacement, and the consumers migrated.
- A repository search or dependency check supports the consumer list, and its limits are stated.
- No persisted-data or schema removal is bundled in without explicit approval and recovery notes.
- Compatibility code is deleted only after the replacement path succeeds at the nearest real entry point.
- The final diff contains no unrelated cleanup presented as part of the cutover.

## Scope and conflicts

This rule can conflict with a public compatibility promise. Resolve the conflict per interface, not per repository: an internal adapter can be removed now while a published flag keeps its documented support window. Record the boundary in the task plan or beside the project's Rules index entry. Neither this rule nor a compatibility rule wins globally by default.

## Provenance

Original MemeRig text. Inspired by the public discussion at <https://x.com/murong97358/status/2124531122826854873>; that post is commentary, no reuse license was established for it, and its author, token-expenditure, and incident claims were not independently verified. This document is not copied from it or from any third-party rule set.
