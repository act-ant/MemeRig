# Trellis Spec Preset

A layered project-spec skeleton for repositories whose conventions differ by layer. It
routes a change to the relevant frontend, backend, or shared rules, then asks for an
explicit contract at every boundary the change crosses.

## What it adds

- [`index.md`](./index.md) — the spec entry point, installed at `.memerig/spec/index.md`.
- Layer routing for frontend, backend, and shared/cross-layer conventions.
- Contract, reuse, and verification rules for changes that cross a boundary.

The preset describes how to organize project rules; it does not invent a directory layout
for your repository. Add `frontend/`, `backend/`, or `shared/` spec files only when the
repository actually has those boundaries, and describe the real directories, commands,
and constraints.

## Install

Choose `trellis` when initializing a project from a MemeRig release that bundles the
starter presets:

```bash
memerig init --template trellis
```

The bundled copy is installed from `dist/templates/starter-specs/trellis` and needs no
network access. Omit `--template` to keep the blank initialization.

For an existing project, adopt a pinned revision on a branch and review the diff:

```bash
git clone https://github.com/blackplume233/MemeRig.git /tmp/memerig
git -C /tmp/memerig checkout <tag-or-commit>
mkdir -p .memerig/spec
cp -R /tmp/memerig/marketplace/specs/trellis/. .memerig/spec/
git diff -- .memerig/spec
```

Keep `README.md` alongside `index.md` so attribution travels with the adopted copy.
Preserve existing project edits; do not overwrite them blindly during an upgrade.

## Source and attribution

- Upstream reference: [Trellis spec templates at commit
  `f089cb3`](https://github.com/mindfold-ai/Trellis/tree/f089cb3286071199e84118dee86b6d76aab032f1/packages/cli/src/templates/markdown/spec)
  (AGPL-3.0).
- This preset paraphrases the upstream layered-spec, cross-layer contract, and reuse
  guidance. It is not a verbatim copy of the upstream template files.
- MemeRig is a fork of Trellis at the same commit and is licensed AGPL-3.0; see the
  repository `COPYRIGHT` and `LICENSE` files.

See the [Marketplace README](https://github.com/blackplume233/MemeRig/blob/main/marketplace/README.md)
for publishing, pinned adoption, and offline-distribution rules shared by all starter
presets.
