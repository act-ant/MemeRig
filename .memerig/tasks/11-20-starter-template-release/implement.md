# Implementation plan

1. Confirm original preset sources and attribution. Finalize the three spec overlays from the starter drafts, with links to upstream sources. Review the Game Dev original before calling the preset an adaptation.
2. Coordinate the shared blank init file contract with the project-discovery child. Register each preset in `marketplace/index.json` and bundle the same directories into the release artifact. Allow an explicit preset choice in the maintainer's installer.
3. Run the init and template fetcher checks. In isolated directories, verify blank and all three presets from the packed release with the network disabled. Compare installed preset contents against Marketplace and check that existing user edits are protected.
4. Document publishing by PR to `main`, version-pinned adoption, and the offline release path. Confirm each index entry resolves to its files before the release PR is ready. Packaging changes follow the repository release process.

```bash
pnpm --filter memerig test test/commands/init.integration.test.ts test/utils/template-fetcher.test.ts test/utils/template-fetcher-overwrite.test.ts
```
