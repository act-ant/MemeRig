# Implementation and release plan

1. Review and approve the recorded self-adoption / stable `0.7.3` release scope, curate task manifests, and start this task.
2. Install only the canonical default Rule documents locally. Add additive Rules navigation to AGENTS.md, CLAUDE.md, and the existing workflow curation instructions, preserving their unrelated content.
3. Add the non-breaking `0.7.3` migration manifest and align both package versions. Do not introduce migrations or change release authentication.
4. Verify local rule parity, curated context, manifest continuity, version alignment, lint/typecheck/build, packed dependency and Rules assets. Exercise built init and no-op update in an isolated repository. Existing commit hooks run full tests.
5. Run GitNexus change analysis and selectively commit the task-owned changes only.
6. Push the selected commit to origin/main and tag `v0.7.3`; explicitly dispatch `publish.yml` against that tag in `act-ant/MemeRig`.
7. Wait for the official publish job, inspect failures if any, and confirm both public npm package versions, dist-tags, and packed CLI core dependency. Complete the task and record the release evidence without sweeping unrelated journal work into commits.

## Recovery

Before publication, fix a failed gate and repeat only the affected check. After publication starts, retain the version identity and use the idempotent CI workflow for a missing package; do not publish locally or force-move a tag without a specific need and authorization.

## Local verification

- Default core/index match the canonical bundled documents byte-for-byte; no optional files adopted. Both task manifests validate with four entries including the two actual Rules files.
- `pnpm lint`, `pnpm typecheck`, and the CLI build passed.
- `verify-packed-cli` confirms the packed CLI depends on exact `memerig-core@0.7.3`; `publish-plan` reports both packages pending under `latest`.
- `npm pack --dry-run --json` contains default Rules and the `0.7.3` manifest, not optional catalog documents.
- Built CLI fresh init installs both Rule files and receipts, leaves Spec README-only, and its update dry-run reports already up to date. The temporary repository was removed.
- The default npm registry is a private mirror and timed out on version history. Official-registry continuity inspection found the historical staging package; its tarball was read without executing scripts and verified against the registry SHA1 before adding the missing record.
