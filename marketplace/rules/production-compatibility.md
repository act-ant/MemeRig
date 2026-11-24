# Production compatibility

**Declaration.** A public or persisted contract changes only with an explicit compatibility decision: what must keep working, for how long, how consumers migrate, and how the change is rolled back.

## Applies to

- Published HTTP, RPC, GraphQL, SDK, CLI, configuration, or plugin contracts.
- Event payloads, webhooks, file formats, database schemas, and other persisted representations.
- Services or clients that upgrade independently rather than in lockstep.
- Anything already documented for users, even if the repository currently has only one consumer.

## Constraints

1. Name the contract, its audience, and its class: external/public, cross-service, persisted data, or internal only.
2. Record a decision: preserve, deprecate with an end date, version alongside the old contract, provide a migration, or break with explicit approval. Do not leave the decision implicit.
3. Provide a migration path: documentation, codemod, adapter, version negotiation, or dual-read/dual-write. A deprecation notice without a usable path is not a plan.
4. Treat persisted data as a contract. State forward and backward behavior, backup and restore expectations, and rollback steps. Destructive migrations require tested recovery, not a promise that they will work.
5. Test the upgrade from the previous supported version, not only a fresh install.
6. State the support window and the removal trigger. Do not keep a "temporary" compatibility path indefinitely without an owner and a date.
7. An internal-only contract may use a shorter window, but say so explicitly; do not let a public surface inherit an internal policy by accident.
8. If a project Spec records a compatibility promise, reconcile it with this rule explicitly. Neither statement silently overrides the other.

## Observable compliance

- The change record names the contract, audience, compatibility class, decision, and support window.
- Consumer migration instructions or automation exist and are referenced from release notes.
- An upgrade-path test from the previous supported version passes.
- Rollback or recovery evidence exists for any persisted-format change.
- Versioned endpoints, deprecation warnings, or dual-read paths exist when coexistence is promised.
- The eventual removal of the old contract has a recorded trigger and owner.

## Scope examples and conflicts

- **Public field vs internal serializer.** A published response field keeps its window and migration path. An internal serializer shim can be removed immediately after its consumers move. The deciding boundary is the interface's audience, not the repository or the developer's preference.
- **Rule vs Spec.** A project Spec might promise that a v1 API stays frozen until a fixed date, while a clean-cutover change wants to delete it now. Both statements remain visible; decide which applies to that interface, update the Spec or the rule's applicability explicitly, and record why. There is no automatic Rule-over-Spec or Spec-over-Rule precedence.
- **Small side project.** With no external users, break-now can be a valid recorded decision, but persisted data and recovery still need explicit handling.

## Provenance

Original MemeRig text. Inspired by the public discussion at <https://x.com/murong97358/status/2124531122826854873>; that post is commentary, no reuse license was established for it, and its author, token-expenditure, and incident claims were not independently verified. This document is not copied from it or from any third-party rule set.
