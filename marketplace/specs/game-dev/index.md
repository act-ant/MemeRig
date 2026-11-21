# Game Development

Use this spec for game repositories where behavior is judged by a playable build, scene,
or interactive prototype. The task record is the source of truth; record engine and
platform facts there rather than relying on a session log.

## 1. Define the playable outcome

For each task, record:

- the player-visible behavior and the feedback that confirms it;
- the smallest playable scenario that demonstrates it (level, save state, test scene, or
  sandbox);
- engine and version, target platform, input devices, and build configuration;
- what is deliberately out of scope.

Write acceptance as observable behavior — "press X, expect Y within Z" or "loading this
save reaches scene N with the HUD showing the saved score" — not as a list of systems to
implement.

## 2. Iterate in small playable loops

Start each iteration from a reproducible state. Change one gameplay variable or system at
a time and capture:

- the engine version and target platform;
- exact launch or build steps;
- inputs, observable outputs, and relevant frame, telemetry, audio, or performance
  observations;
- known limitations and platform differences.

If the loop stops being playable, record why and the smallest next step that restores
playability. Do not stack unverified changes on a broken baseline.

## 3. Keep asset changes traceable

For every added or modified asset, record:

- source or author, license or terms, and the original URL or file;
- import settings, compression, scale, units, and any engine-specific conversion;
- where it is referenced (scene, prefab, material, animation, or build script).

Verify the scene or build that consumes the asset, not only that the file imports. Keep
generated or cached artifacts out of the source of truth, and do not commit assets whose
license does not allow redistribution.

## 4. Deliver evidence

Provide at least one of:

- a runnable build or test scene with exact launch steps;
- a reproducible scripted or manual playthrough;
- a capture plus the inputs and configuration needed to reproduce the observed result.

For save/load, input, or platform-specific behavior, verify the actual path rather than
assuming the editor preview matches the target platform. Record performance observations
when the change could affect frame time, memory, load time, or audio latency.

## 5. Handoff

The next session or person should be able to:

- launch or build the recorded scenario;
- reproduce the observed behavior with the listed inputs and settings;
- distinguish verified platform behavior from editor-only or assumed behavior;
- start from the recorded next action without guessing at engine state.

## Review checklist

- [ ] Acceptance names player-visible behavior and a concrete scenario.
- [ ] Engine, version, target platform, and input devices are recorded when relevant.
- [ ] Each asset has provenance, license, and import/reference evidence.
- [ ] The consuming scene or build was exercised, not just the asset import.
- [ ] Verification evidence includes exact steps and observed results.
- [ ] Unfinished or unplayable work has a next action and known limitations.

## Provenance

Original engine-neutral MemeRig starter preset. No upstream Game Dev template was
verified for this release, so this is not an adaptation of a specific existing template.
See the [preset README](./README.md) for the full provenance statement.
