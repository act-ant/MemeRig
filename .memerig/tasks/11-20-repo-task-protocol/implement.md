# Implementation plan

1. Confirm current Python and TypeScript readers and writers, including platform hooks, starter task factories, and archive readers. Map legacy record fields and record affected public API references before editing.
2. Implement the schema and shared fixtures, then make the checked-in Python runtime the lifecycle writer. Use one version-token check and atomic replacement path for updates and close operations. Align the bundled Python files and generated projects with the checked-in runtime.
3. Implement migration preview and application. Exercise active and archived fixtures with parent links and Markdown artifacts. Verify apply can be rerun and the preview detects records that require resolution before any replacement.
4. Migrate the repository and first-party callers. Run the affected Python task integrations and Core task tests. Exercise two processes with a shared snapshot, close one real task twice, and check the closed view and stable path.
5. Document the machine-readable output, concurrency boundary, and Git collaboration procedure. Keep a backup until ownership and artifact checks pass.

```bash
pnpm --filter memerig test test/scripts/task-archive.integration.test.ts test/scripts/task-children-normalization.integration.test.ts test/scripts/task-list-tree.integration.test.ts test/scripts/task-meta.integration.test.ts
pnpm --filter memerig-core test test/task
```
