# Attractor construction: default examples

These examples illustrate the default method in
`.memerig/attractor-guide.md`. They are optional conversation aids, not preset
values, not a mandatory script, and not a second method. Use them only after
the project has explicitly adopted construction or the user has explicitly
asked for it, and only when the selected method calls for examples.

Adapt the language to the project. Do not copy an example's product values into
a user's repository.

## Greenfield: vague desired direction

The user may begin with "I want this to feel simple and extensible." That is a
starting point, not a specification.

A useful next question targets one observable consequence:

> "If a new contributor opens the project next month, what should be obviously
> easy: adding a new adapter, changing the UI flow, or running the whole system
> locally? If those conflict, which one should win?"

Then synthesize only what the answer establishes:

```markdown
## Confirmed direction
- Running the project locally is a first-class outcome; a hosted service is
  not required for the core workflow.

## Proposed interpretation
- This may imply that integrations stay optional rather than mandatory.
  Proposed, not adopted.

## Open questions
- Should adapters be a supported extension point, or only an internal detail?
```

Do not turn "simple and extensible" into a list of invented architectural
rules. Do not cite code patterns that do not exist. A blank repository has no
evidence beyond the user's intent and references they choose to name.

## Existing repository: evidence versus direction

Suppose the code has three different error-handling patterns and the user says,
"I want errors to be predictable." The implementation is evidence about the
current state, not proof of the intended future.

Ask:

> "Should the future direction standardize on one error shape? The current code
> has three variants; is one of them the pattern to preserve, or is the desired
> property something none of them provides yet?"

Record the distinction explicitly:

```markdown
## Current code contract
- The CLI surfaces provider errors as formatted messages; some paths still
  catch and discard them. See the relevant package spec for the current rules.

## Confirmed direction
- Errors should identify the failing input and the next action.

## Proposed interpretation
- Standardizing on one structured error type is one way to satisfy that
  property. Proposed, not adopted.
```

A question such as "which current behavior should we preserve, and which is
accidental?" is usually more productive than asking the user to describe a
complete target architecture. Do not equate "what the repository does today"
with "what the user wants the repository to become."

## UI and interaction design

For a UI-heavy project, ask for an observable experience or a concrete
reference:

> "Should the main screen prioritize scanning many items at once, or guiding a
> new user through one decision at a time? Both are defensible; which should
> win when they conflict?"

Follow up with an example to emulate or avoid:

> "Is there a product whose interaction here you want to borrow? What
> specifically should we take from it: density, keyboard flow, progressive
> disclosure, or something else?"

Record the property, not just the product name:

```markdown
## Design qualities
- The primary view should support scanning many items without a wizard.
- Keyboard-first navigation is part of the intended experience.
- A product reference is useful for its information density, not its visual
  style.

## Open questions
- Accessibility target and small-screen behavior are not decided yet.
```

Skip UI dimensions entirely for a project without a user-facing interface.

## Partial progress and deliberate deferral

The user may answer one question and stop. That is a valid outcome.

```markdown
## Confirmed direction
- The project should remain locally runnable without a cloud account.

## Open questions
- Whether plugin support is in scope is deferred; ordinary work continues.
- Whether the current command structure should change is unresolved.
```

Do not keep interviewing after the current uncertainty is resolved. Do not
create a follow-up task, a "missing direction" warning, or a completion gate
for the unresolved parts. If a later task genuinely depends on an unresolved
question, surface it in that task's design discussion.

## Later amendment: focused, with rationale

A later conversation establishes a new preference that conflicts with a stated
direction. Propose a focused amendment:

> "The current direction says integrations must stay optional. Today's
> decision to require a database for sync seems to conflict. Should we amend
> the direction to allow an optional local database, or keep the
> no-required-backend property and change the design? Here is the specific
> statement I would change and why."

Record only the calibrated result:

```markdown
## Evolution notes
- 2026-11-24: clarified that a local database is acceptable for optional sync
  features, while the core workflow still runs without one. The previous
  "no required backend" property remains.
```

A confirmed amendment does not need re-approval of the rest of the document.
It also does not authorize unrelated refactors or a new task.

## One-off exception versus repository-wide direction

A user may approve one exception, such as adding a direct dependency in a
single package despite a general preference for shared abstractions.

Default handling:

- Record the exception in the task or implementation note, not the attractor.
- Do not rewrite the repository-wide direction from one local choice.
- If the same preference recurs, ask whether the user wants to generalize it:

> "This is the third place where a direct dependency was preferred over a
> shared wrapper. Should that become project-wide direction, or are these local
> exceptions?"

Only a confirmed answer changes the attractor's repository-wide meaning.

## Non-adopting project or explicit one-off request

If the selected template never adopted attractor construction and the user has
not asked for it, do not start this conversation. If the user explicitly asks
to think through long-term direction, help with the current design discussion
using the default guide, but do not:

- create `.memerig/spec/attractor.md` automatically;
- change templates, workflows, or project policy;
- add attractor references to task manifests that do not need them;
- create or start a task;
- warn about the capability's absence later.

If the project later adopts the capability, treat the earlier discussion as
unconfirmed context unless the user confirms it as direction.

## Loading and preserving direction

When direction is relevant, load the actual `.memerig/spec/attractor.md` file.
In delegated work, reference the actual file through the existing task
manifests, using the Python command this project uses for the other
`.memerig/scripts/` commands (often `python3`, `python` on Windows):

```text
python3 ./.memerig/scripts/task.py add-context <task> implement .memerig/spec/attractor.md "<why the task needs the direction>"
python3 ./.memerig/scripts/task.py add-context <task> check     .memerig/spec/attractor.md "<what review needs to preserve>"
```

Do not inject the file into unrelated tasks. If the project stops adopting the
capability, leave an existing attractor untouched but do not reactivate it or
treat its contents as mandatory.
