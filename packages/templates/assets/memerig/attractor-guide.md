# Repository attractor guide

This guide explains how to help a project form and maintain a **repository
attractor**: a user-owned statement of the design direction the project should
move toward. It is the default method used by the default Spec guidance
template.

The installed copy lives at `.memerig/attractor-guide.md`. It is a managed
resource, not an adoption declaration, and no platform skill is required to use
it.

## Adoption comes first

An installed guide, bundled skill, or existing attractor file does **not**
adopt this method. Only the current template/project instructions or an
explicit user request can do that.

- If the selected Spec entry or workflow explicitly adopts this guide, follow
  it.
- If the selected template names its own construction method, follow that
  method instead. It may reuse, extend, or replace this guide.
- If the selected template is silent or explicitly declines the capability,
  do not ask attractor questions, do not require `.memerig/spec/attractor.md`,
  do not warn about its absence, and do not add attractor work to onboarding,
  tasks, checks, or completion. Templates do not need an opt-out declaration.
- If the user explicitly asks to construct or use an attractor for the current
  work, help them. That request does not, by itself, install a permanent
  project policy.
- If active instructions conflict about adoption or about which method applies,
  surface the concrete conflict and ask which instruction should govern.
  Never resolve it by file order, installation order, or by silently choosing
  this guide. A missing or broken custom guide is a real problem to report, not
  a reason to substitute the default.

An old attractor may remain after a project stops adopting the capability.
Preserve its bytes, but do not treat its presence as adoption, as mandatory
context, or as incomplete work. Explicit task references to it remain usable
through the ordinary context mechanisms.

Template authors own adoption in the selected template's Spec entry documents.
Do not copy this generic guidance into unrelated preset READMEs, and do not
ship a supposed project vision as template content.

## What an attractor is

An attractor is the repository's intended long-term design direction across the
dimensions that matter to the project:

- framework and architecture;
- code design and engineering qualities;
- user-interface and interaction qualities;
- product properties that determine what the system should optimize for.

It can describe a family of coherent future designs rather than one frozen
implementation. It is not a roadmap, a task list, a numerical score, a
convergence proof, or a replacement for current executable contracts. A useful
attractor explains what the project should become and which tradeoffs it should
make along the way.

Keep the scope honest:

- Omit dimensions that do not apply. A backend library does not need generic UI
  boilerplate, and a visual prototype does not need invented framework rules.
- Prefer observable properties and concrete examples over slogans.
- Record only the direction that has actually been discussed. An incomplete
  document is better than a fabricated vision.

## Where the document lives

For a project that adopts this method, the project-owned result is:

```text
.memerig/spec/attractor.md
```

Create the file when there is meaningful confirmed direction or concrete
exploration worth retaining. Do not install an empty scaffold and do not fill
every possible heading just to look complete.

The root location distinguishes project-wide direction from package- and
layer-level code contracts. A statement that applies only to one package or UI
surface can name that scope in the document; no new hierarchy is required.
Existing documents can be linked for examples and rationale instead of copied
wholesale.

## Ownership and preservation

`.memerig/spec/attractor.md` is user-authored project content, not bundled
template content and not a preset document. Init, re-init, template switches,
and ordinary updates must preserve it. File collisions use the existing
preservation/review behavior; they do not justify silent replacement,
regeneration from current code, or installation-order precedence.

In an adopting project, a new developer or joiner should read the existing
direction before proposing changes to it. Material changes go through the
amendment process below rather than replacing the document wholesale. If the
project stops adopting the method, leave the file intact; its presence alone
does not reactivate the practice.

A template that names its own method may reuse, extend, or replace this guide.
Follow only that selected route; do not also run this guide's interview as a
second default process.

## Current code contracts versus desired direction

These are different kinds of truth and both must remain visible:

| Document | Answers | Applies to work |
| --- | --- | --- |
| Code specs under `.memerig/spec/<package>/<layer>/` | How does this code work **now**? What can implementation rely on? | Current changes; follow them unless the approved task changes them |
| `.memerig/spec/attractor.md` | Where should the project **go next**? Which qualities and tradeoffs should guide future choices? | Planning and design decisions, within approved task scope |
| Task artifacts | What is this task authorized to change? | The active task |

Rules of use:

- Code specs describe existing contracts, not aspirational wishes. Record tech
  debt as it is; fixing it is a separate, approved task.
- The attractor describes intended evolution, not proof that the intended
  design already exists.
- Current code can be evidence for a design discussion. It is not evidence of
  the user's desired future.
- When direction and an executable contract conflict, surface the competing
  assumptions in the relevant design decision. Do not let either file
  automatically win, and do not rewrite the repository in the background.
- The approved task still owns the scope of changes. Direction informs a task;
  it does not expand permission to refactor unrelated code.

## When construction happens

For an adopting project, construction can begin during initialization and
continue during normal collaboration. It is a conversation, not a fixed
questionnaire. An automatically created onboarding task is not required; when
none exists, begin at the next relevant design interaction.

Start or resume it when at least one of these is true:

- Setup or onboarding for the adopted template includes direction discovery.
- The user states a material design preference or changes the project's
  purpose.
- A material design tradeoff has no clear answer in the existing direction.
- A recurring preference is visible in several explicit choices.
- A product-direction change makes the current direction stale.

Mere task completion is not a mandatory revision trigger. Do not ask unrelated
attractor questions on a schedule, and do not turn every ordinary goal,
acceptance criterion, or implementation exception into an attractor.

Deliberate deferral is valid within an adopted process: if the user does not
want to settle a question yet, record the open question (or leave it in the
current conversation/task notes when that is where the deferral belongs) and
continue the actual work. Deferral is not a missing file, a failure, or a
completion blocker.

## Elicitation of initially vague direction

A short focused exchange is usually enough:

1. Read the existing direction, the user's current request, and only the code
   or documents needed to avoid asking answerable questions.
2. Identify the next consequential uncertainty: purpose, desired experience,
   a quality to preserve, an example to emulate or avoid, or a concrete
   tradeoff.
3. Ask one focused question. Give context and a recommendation where useful.
   Do not require the user to know the word "attractor" or to answer an
   exhaustive questionnaire.
4. Synthesize what the answer establishes. When the user explicitly states
   intent or makes a decision, record that intent directly; do not ask for the
   same approval again.
5. If you infer a broader principle from an example or repeated local choice,
   present that interpretation for calibration before treating it as
   repository-wide direction.
6. Persist useful progress in `.memerig/spec/attractor.md`, keeping proposals
   visibly separate. Stop when the current uncertainty is resolved, the user
   defers, or the work needs to continue.

Good questions are concrete:

- "Which property matters most here: [A] or [B]? If both, what should win when
  they conflict?"
- "Is there a product or internal system whose behavior here we should
  emulate? What specifically should we take from it?"
- "Should the next design preserve [current property] or deliberately move
  away from it?"
- "This repository currently does [X]. Is that a convention to keep, or just
  the current implementation?"
- "If we only got one observable outcome from this work, what should it be?"

Avoid multi-part discovery forms, leading questions that assume an answer, and
questions whose answer is already visible in the code or an approved task.

## Scenario: greenfield project

There is no code evidence yet, so do not invent it. Start from the user's
intent:

- Who is the primary user, and what should become easier or possible?
- What should the first usable version feel like?
- Which qualities matter most: speed, clarity, extensibility, safety,
  visual calm, accessibility, offline use, and so on?
- Is there an example to emulate or avoid, and why?
- Which compromise would be unacceptable?

A short initial document is fine. Example shape:

```markdown
# Repository attractor

## Confirmed direction
- Primary user: a solo maintainer who needs to understand the system quickly.
- The project should stay small and locally runnable; no hosted service is
  required for the core workflow.

## Design qualities
- Prefer explicit data flow over implicit shared state.
- Errors must identify the failing input and the next action.

## Open questions
- Is plugin support part of the eventual design, or out of scope?
```

This example is an illustration, not content to copy into a user's project.

## Scenario: existing repository

Use the code, references, tests, and past decisions as discussion material, not
as authority over the future:

- "Which of these current properties do you want to preserve?"
- "Which current behavior is accidental and should not constrain the future?"
- "This pattern appears in three places. Is it a convention to keep, or should
  the next design replace it?"
- "What would make a future change feel wrong even if it passes the tests?"

Describe candidate interpretations as proposals until the user endorses their
repository-wide meaning. Do not tell the user that the current architecture is
their desired direction merely because it is the current architecture.

## Scenario: UI and interaction design

When the project has a user-facing surface, the attractor can record:

- the intended user experience and interaction qualities;
- layouts, flows, or products to emulate or avoid, with the property being
  borrowed;
- accessibility, responsiveness, performance, and state-handling expectations;
- visual or interaction tradeoffs that should win when they conflict.

Ask about observable examples rather than abstract style labels. A screenshot,
existing screen, competitor, or explicit rejection is more useful than
"modern" or "clean" without context. Skip this dimension for projects without a
user interface.

## Recording confirmed direction and proposals

Use whatever headings fit the project, but keep these distinctions visible:

- **Confirmed direction**: the user stated it or explicitly approved it. Record
  it without re-asking. These are the accepted properties and tradeoffs.
- **Proposed interpretation**: you inferred it from code, examples, or a local
  choice. Label it as a proposal. It becomes direction only after calibration
  with the user.
- **Open question**: a concrete unresolved choice. It is allowed to remain.

A useful minimal structure:

```markdown
# Repository attractor

## Purpose and confirmed direction
What the project serves and what it should become.

## Design qualities
Applicable architecture, code, and UI properties, with observable examples.

## Tradeoffs and boundaries
Which qualities win when they conflict, and what the project deliberately
avoids.

## Open questions and proposals
Unresolved questions and interpretations that are not adopted yet.

## Evolution notes
Brief reasons for material changes; link existing decisions where useful.
```

If there is only exploration, say so explicitly under a heading such as
"Exploration, no direction adopted yet" instead of leaving a misleading empty
"Confirmed direction" section. Do not duplicate entire code specs or decision
records; link them when they carry the detail.

## Later amendments

When a later design conversation establishes new durable direction, propose a
focused amendment:

- name the specific statement being added, changed, or removed;
- give the concrete rationale (new user intent, resolved tradeoff, product
  change, or a recurring preference that the user endorses);
- show what is current code behavior versus what is intended future behavior;
- ask for confirmation when the inference is broader than the user's explicit
  statement.

A one-off implementation exception is not automatically a repository-wide
amendment. Only generalize it when the user confirms that meaning. A confirmed
amendment can be recorded directly; the unchanged parts of the document do not
need re-approval.

Amendments do not authorize new tasks, unrelated refactors, or retroactive
changes to approved work. Task creation and task scope keep their existing
consent and planning gates.

## Loading direction into work

An attractor helps only when its actual content is available to the work that
needs it. A link, filename, or index entry is not loaded content.

For explicit adopters:

- In the main session, read this guide when constructing or amending, and read
  the relevant portions of `.memerig/spec/attractor.md` when the current design
  decision needs them. Session-start or continuation routing may point here; it
  should not pretend the file was read.
- In planning, include `.memerig/spec/attractor.md` when the task genuinely
  depends on project direction. Reuse the existing task manifests and loader,
  using the Python command this project uses for the other `.memerig/scripts/`
  commands (often `python3`, `python` on Windows):

  ```text
  python3 ./.memerig/scripts/task.py add-context <task> implement .memerig/spec/attractor.md "<why this task needs the direction>"
  python3 ./.memerig/scripts/task.py add-context <task> check     .memerig/spec/attractor.md "<what review needs to preserve>"
  ```

- For delegated implementation and checking, the manifest should reference the
  actual file when it is relevant. Do not assume a link in the README or a
  workflow reference expanded itself.
- For inline or main-session work, read the file directly when the selected
  method makes it relevant.
- Do not inject the attractor into every task merely because the file exists.
  Directory presence is not adoption, and relevance is a task/session decision.
- When the project does not adopt the capability, skip these steps. Do not add
  a missing-direction warning, an automatic context prelude, or a completion
  check.

Current executable contracts and approved task scope govern what the code must
do today. The attractor is additional design context, not an instruction to
enforce unadopted proposals or refactor unrelated areas.

## Distinguishing absence, deferral, and non-adoption

| Situation | What to do |
| --- | --- |
| No adoption and no explicit request | No attractor concept, questions, project files, reminders, or gates |
| Adopted, but nothing recorded yet | Ordinary work continues; start with a focused question when relevant |
| Adopted, user defers a question | Record or hand off the open question if useful; continue ordinary work |
| Adopted, user explicitly declines further construction | Respect the decision; continue ordinary work, preserve existing content, and do not repeatedly raise the topic |
| Adopted, partial direction exists | Use what is confirmed; keep proposals labeled; extend incrementally |
| Explicit user request in a non-adopting project | Help with the current work without silently changing permanent policy |
| Adoption removed, old attractor exists | Preserve the file; do not reactivate, require, or auto-inject it |

Non-adoption is not deferred construction. Do not create a task, checklist
item, or reminder to "come back to the attractor" in a project that does not
adopt this method.

## Quick checklist for adopters

- [ ] The selected instructions actually adopt construction or the user asked
      for it.
- [ ] One focused question targets the next real uncertainty.
- [ ] Confirmed intent is recorded without asking for the same approval twice.
- [ ] Inferred repository-wide meaning is labeled as a proposal and calibrated.
- [ ] Irrelevant dimensions are omitted; no invented code or UI evidence.
- [ ] Current code contracts remain separate from desired future direction.
- [ ] Partial progress and open questions are allowed.
- [ ] The attractor document, if created, contains real content, not an empty
      scaffold.
- [ ] Relevant contexts load the actual file; unrelated tasks do not.
- [ ] No automatic task creation and no unapproved repository-wide rewrite.
