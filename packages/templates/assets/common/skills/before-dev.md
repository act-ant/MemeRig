Read the relevant development guidelines before starting your task.

Execute these steps:

1. **Read current task artifacts**:
   - `prd.md` for requirements and acceptance criteria
   - `design.md` if present for technical design
   - `implement.md` if present for execution order and validation plan

2. **Read applicable project rules**:
   ```bash
   cat .memerig/rules/index.md
   cat .memerig/rules/<rule>.md   # each rule whose applicability covers this work
   ```
   `core.md` always applies. The index is a route, not the rule body: open the linked files. Do not load optional rules that the index does not list.

   User-level rules: read `~/.memerig/rules/*.md` when present — every `load: always` body, and `load: index` rules whose applicability covers this work. These are personal rules, not project adoptions; do not add them to task manifests.

3. **Discover packages and their spec layers**:
   ```bash
   python3 ./.memerig/scripts/get_context.py --mode packages
   ```

4. **Identify which specs apply** to your task based on:
   - Which package you're modifying (e.g., `cli/`, `docs-site/`)
   - What type of work (backend, frontend, unit-test, docs, etc.)
   - Any spec/rule/research paths referenced by the task artifacts

5. **Read the spec index** for each relevant module:
   ```bash
   cat .memerig/spec/<package>/<layer>/index.md
   ```
   Follow the **"Pre-Development Checklist"** section in the index.

6. **Read the specific guideline files** listed in the Pre-Development Checklist that are relevant to your task. The index is NOT the goal — it points you to the actual guideline files (e.g., `error-handling.md`, `conventions.md`, `mock-strategies.md`). Read those files to understand the coding standards and patterns.

7. **Always read shared guides**:
   ```bash
   cat .memerig/spec/guides/index.md
   ```

8. **For a non-trivial task, state the change boundary before writing code.** Non-trivial means it touches more than one file, crosses a layer, changes a public interface, or edits code you did not just write. Write down:
   - the smallest behavior gap between what happens now and what should happen
   - where that behavior actually lives (not where it is easiest to intercept)
   - which files you expect to change, and why each one is necessary
   - what you are explicitly not doing in this task
   - if a local refactor is needed, how you will show it did not change behavior

   A small, well-scoped change does not need this — do it directly.

   If the real scope turns out to be clearly larger than this, say so and why before continuing. Do not widen the change on your own.

8. Understand the coding standards and patterns you need to follow, then proceed with your development plan.

This step is **mandatory** before writing any code.
