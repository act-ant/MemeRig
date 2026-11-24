# Architecture research

**Declaration.** A consequential, hard-to-reverse architecture choice needs a documented comparison of established options and the reasons the chosen one fits. Small, reversible edits do not.

## Applies to

- A new service, datastore, queue, authentication boundary, or synchronization model.
- Replacing a framework, runtime, primary language, or build/deployment platform.
- A data model or migration whose consequences will outlive the task.
- A vendor or hosted-platform commitment with material exit cost.
- A performance or scale approach whose trade-offs are not already settled by the project.

## Does not apply to

- Local refactors, bug fixes, formatting, small dependency choices, and one-off scripts.
- Decisions already fixed by a current project Spec, unless the task explicitly proposes changing that decision.
- Situations with one obviously correct answer in the existing architecture.

## Constraints

1. State the decision, the constraints it must satisfy, and what a good outcome looks like.
2. Compare at least two realistic candidates. Include the current approach or "do nothing" when either is viable.
3. Use established products, documentation, benchmarks, and production reports. Cite the source and its date or version; keep vendor claims separate from measured facts.
4. Compare operational cost, failure modes, migration effort, lock-in, maintenance, and the team's ability to run the result.
5. Prefer proven designs. A custom design needs an explicit justification, not just a preference for ownership.
6. Timebox uncertain spikes. Keep spike code out of the production path, record the measurements, and remove the artifact when it is no longer needed.
7. Record the decision, rejected options, and conditions that would justify revisiting it in the task design or a project Spec.
8. Scale the research to the consequence: a short note for a moderate choice, a deeper study for an irreversible one.
9. Do not use research as an excuse to avoid a small, obvious change.

## Observable compliance

- The decision record lists criteria, candidates, evidence, the chosen option, and why each rejected option lost.
- External claims are dated and sourced; inferences are marked as inferences.
- Migration, rollback, and revisit triggers are stated for a hard-to-reverse choice.
- Spike code and temporary benchmarks are removed or clearly marked as non-production.
- No unverified marketing claim is presented as a measured fact.

## Scope and conflicts

A baseline preference for the simplest sufficient implementation does not contradict this rule: research applies to the consequential choice, and simplicity applies within the chosen option. Adding a date-formatting helper needs no study; choosing a primary datastore does. If an existing project Spec already fixes the architecture, follow it or propose an explicit change; this rule does not silently override a recorded decision. When two declarations conflict, narrow the applicability or record the exception instead of assuming a global priority.

## Provenance

Original MemeRig text. Inspired by the public discussion at <https://x.com/murong97358/status/2124531122826854873>; that post is commentary, no reuse license was established for it, and its author, token-expenditure, and incident claims were not independently verified. This document is not copied from it or from any third-party rule set.
