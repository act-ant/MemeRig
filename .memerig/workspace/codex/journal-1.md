# Journal - codex (Part 1)

> AI development session journal
> Started: 2026-11-22

---



## Session 1: Package built-in templates
<!-- memerig-session: v=2 fp=905c2354fa0398e3 -->

**Date**: 2026-11-22
**Task**: Package built-in templates
**Package**: cli
**Branch**: `main`

### Summary

Verified offline starter specs and standalone Git registry tag resolution using the packed CLI.

### Git Commits

| Hash | Message |
|------|---------|
| `9416d4f52b` | refactor(templates): move built-in assets to a private workspace package |

### Status

[OK] **Completed**


## Session 2: npm trusted publishing for 0.7.0
<!-- memerig-session: v=2 fp=ca7a774dac894272 -->

**Date**: 2026-11-22
**Task**: npm trusted publishing for 0.7.0
**Package**: cli
**Branch**: `main`

### Summary

Switched publish.yml to OIDC trusted publishing (Node 24, pnpm 12.21.0, no NPM_TOKEN), moved toolchain to pnpm 12.21.0 with allowBuilds for esbuild, bumped both packages to 0.7.0 and added the 0.7.0 migration manifest. Verified: release-preflight gates, frozen install, typecheck, build, 1772 tests.

### Git Commits

| Hash | Message |
|------|---------|
| `1c6153b041` | chore(release): publish 0.7.0 via npm trusted publishing |

### Status

[OK] **Completed**


## Session 3: Restore interactive init guidance
<!-- memerig-session: v=2 fp=48802b192e8312e5 -->

**Date**: 2026-11-22
**Task**: Restore interactive init guidance
**Package**: cli
**Branch**: `main`

### Summary

First init asks for platforms + spec template again; no-platform install is an explicit AGENTS.md open-protocol mode; non-TTY never prompts. Verified by unit + integration tests and real CLI smoke (init -y, -y --claude, -y --template trellis).

### Git Commits

| Hash | Message |
|------|---------|
| `3c42a0d5` | feat(cli): restore interactive init guidance with AGENTS.md open protocol |

### Status

[OK] **Completed**
