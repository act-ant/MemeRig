# Game Dev Spec Preset

An engine-neutral project spec for game and interactive-experience repositories. It
focuses on playable acceptance scenarios, traceable assets, and evidence another person
can reproduce.

The preset does not assume Unity, Unreal, Godot, or a custom engine. Add engine-specific
directories, commands, build steps, and packaging rules to the project's own spec after
adoption.

## What it adds

- [`index.md`](./index.md) — the spec entry point, installed at `.memerig/spec/index.md`.
- A playable-outcome format for tasks: player-visible behavior, scenario, engine, and
  platform.
- Asset provenance and import-setting checks.
- Evidence and handoff rules for builds, test scenes, and captures.

## Install

Choose `game-dev` when initializing a project from a MemeRig release that bundles the
starter presets:

```bash
memerig init --template game-dev
```

The bundled copy is installed from `dist/templates/starter-specs/game-dev` and needs no
network access. Omit `--template` to keep the blank initialization.

For an existing project, adopt a pinned revision on a branch and review the diff:

```bash
git clone https://github.com/blackplume233/MemeRig.git /tmp/memerig
git -C /tmp/memerig checkout <tag-or-commit>
mkdir -p .memerig/spec
cp -R /tmp/memerig/marketplace/specs/game-dev/. .memerig/spec/
git diff -- .memerig/spec
```

Keep `README.md` alongside `index.md` so provenance travels with the adopted copy.
Preserve existing project edits; do not overwrite them blindly during an upgrade.

## Provenance

Original MemeRig starter preset, finalized from MemeRig's engine-neutral planning draft.
No upstream Game Dev template was verified for this release, so this preset is **not**
described as an adaptation of any specific template. If a source is identified later,
record it here before changing the preset's provenance statement.

See the [Marketplace README](https://github.com/blackplume233/MemeRig/blob/main/marketplace/README.md)
for publishing, pinned adoption, and offline-distribution rules shared by all starter
presets.
