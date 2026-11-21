# Implementation plan

1. Define base config and project-root ownership resolution. Coordinate the blank output contract with the starter-template release child. Add diagnostics and cover nested directories, Git submodules, independent ownership, and an unavailable parent.
2. Simplify initial and joiner flows, retaining platform integration as an explicit choice. Switch platform context to the repository-local reader and preserve user-managed setup during updates. Validate initialized projects with integration enabled and disabled.
3. Apply explicit task Git policy and preserve existing repository behavior on update. Verify in a temporary Git repository with both ignored tasks and pre-existing tracked tasks. A fresh clone must run a complete task lifecycle without a user directory or session identity.
4. Add explicit registration and query paths to the local discovery component, then integrate the optional catalog with existing memory project inspection. Use an isolated catalog and two checkouts of a shared ID to verify grouping, removal, and stale paths. Project-local operation must survive absent catalog state.
5. Run targeted init and joiner tests and the existing memory tests covering project grouping. Document configuration precedence and show how a maintainer inspects applied policy.

```bash
pnpm --filter memerig test test/commands/init.integration.test.ts test/commands/init-joiner.integration.test.ts
pnpm --filter memerig-core test test/mem
```
