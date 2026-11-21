# Learning Harness Spec Preset

A project spec for repositories where the work is learning: courses, exercises, study
projects, or deliberate skill practice. It keeps one verifiable learning goal per task,
requires evidence from an attempt before completion, and leaves a handoff another person
can reproduce.

## What it adds

- [`index.md`](./index.md) — the spec entry point, installed at `.memerig/spec/index.md`.
- A goal/evidence/handoff loop that uses the repository's task records as the durable
  source of truth.
- Review checks for reproducibility, source applicability, and unfinished work.

## Install

Choose `learn-harness` when initializing a project from a MemeRig release that bundles
the starter presets:

```bash
memerig init --template learn-harness
```

The bundled copy is installed from `dist/templates/starter-specs/learn-harness` and
needs no network access. Omit `--template` to keep the blank initialization.

For an existing project, adopt a pinned revision and review the diff before committing:

```bash
git clone https://github.com/blackplume233/MemeRig.git /tmp/memerig
git -C /tmp/memerig checkout <tag-or-commit>
mkdir -p .memerig/spec
cp -R /tmp/memerig/marketplace/specs/learn-harness/. .memerig/spec/
git diff -- .memerig/spec
```

The installer writes this directory into `.memerig/spec/`; keep `README.md` alongside
`index.md` so the attribution stays with the adopted copy. On subsequent upgrades,
review the new revision as a normal Git change instead of silently overwriting local
edits.

## Source and attribution

- Upstream reference: [Learning Harness Engineering — Template
  Guide](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/resources/templates/index.md)
  (MIT).
- This preset paraphrases that guide's goal list, evidence, and handoff practices. It is
  not a verbatim copy of the upstream templates. Consult the upstream repository for the
  authoritative text and license terms.

See the [Marketplace README](https://github.com/blackplume233/MemeRig/blob/main/marketplace/README.md)
for publishing, pinned adoption, and offline-distribution rules shared by all starter
presets.
