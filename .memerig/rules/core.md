# Core Engineering Rules

Applies to all project work. Read the relevant project specs alongside these rules.
If declarations conflict, identify the conflict and resolve its scope before making
an irreversible change; this file does not override project contracts.

1. **Understand before adding.** Inspect relevant code, callers, specs, tests, and
   dependency capabilities before introducing a new implementation or package.
2. **Choose the simplest sufficient implementation.** Satisfy the complete agreed
   requirement without speculative abstractions, configuration layers, or unrelated
   cleanup. Complexity needs a concrete current reason.
3. **Grow through verifiable end-to-end slices.** Establish a working path, then
   extend it. Do not dismantle working behavior for hypothetical future needs, or
   use incremental delivery to omit agreed requirements or claim unfinished work is done.
4. **Keep responsibilities clear.** Put contracts and behavior with their owner.
   Separate concerns where the code needs a real boundary, not to manufacture layers.
5. **Reuse before acquiring or rebuilding.** Prefer suitable project code, existing
   dependencies, and standard-library facilities. Add a maintained dependency when
   its benefit justifies its maintenance, license, security, and integration costs.
6. **Make maintainable decisions.** Use proven patterns for consequential design
   choices. Avoid known dead ends and unexplained temporary workarounds without
   designing for imaginary scale or researching every trivial edit.
7. **Preserve user work, data, and contracts.** Do not overwrite unrelated changes.
   Check consumers and stored formats before removal; obtain explicit authorization
   for destructive operations and honor required migrations and recovery plans.
8. **Verify and report evidence.** Exercise the changed behavior through the nearest
   real entry point. State what ran and its result; disclose unverified behavior and
   remaining risks rather than implying success.
