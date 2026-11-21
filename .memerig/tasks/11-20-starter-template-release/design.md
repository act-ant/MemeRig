# Design

Blank is the default and takes the shared base path offline. Each named preset adds only a spec overlay installed under `.memerig/spec/`. Presets carry source and attribution information. The repository's own `.memerig/spec/` is project-specific and belongs to the MemeRig project.

Keep the source of truth in `marketplace/specs/learn-harness`, `marketplace/specs/trellis`, and `marketplace/specs/game-dev`. Add `type: "spec"` entries to `marketplace/index.json`, with paths relative to that directory. The release build bundles the same template bytes. Relative links must work from the installed spec. Update must report conflicts with user edits.

[Starter drafts and publishing notes](research/starter-templates.md) capture the Learn Harness and Trellis references, an engine-neutral Game Dev draft, and the publication steps. The Game Dev original is unverified. Confirm its source before finalizing adaptation and attribution. Marketplace serves its default index from `main`. A pinned Git ref or release artifact gives maintainers repeatable installs. Installing or upgrading project files and distributing them to collaborators are separate operations.
