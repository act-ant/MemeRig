# MemeRig Marketplace Starter

Copy this directory's contents, including `.github/`, into the root of a standalone GitHub repository. The examples provide a backend spec and a workflow adapted from the MemeRig TDD workflow. Preserve upstream attribution and licensing when redistributing the workflow.

In GitHub **Settings → Secrets and variables → Actions → Variables**, set
`MEMERIG_SOURCE_REPO` to the public MemeRig source repository (`OWNER/REPO`)
and `MEMERIG_SOURCE_REF` to the full commit SHA to test against. Actions builds
the pinned source with pnpm and uses that CLI for the installation checks.

## Author a template

1. Create `specs/<id>/index.md` and link to any supporting Markdown files from it. Add a README describing adoption and maintenance.
2. For a workflow, copy the example to `workflows/<id>/workflow.md` and customize its steps. Keep the phase headings, numbered steps, platform markers, and workflow-state blocks used by MemeRig.
3. Add an `id`, `type`, `name`, and `path` to `index.json`. Use unique lowercase kebab-case IDs. Spec paths point to directories. Workflow paths point to files.
4. Run `node scripts/check-registry.mjs`. Commit your changes and open a pull request. Actions checks the index and uses the pinned CLI to install every entry from the checked-out Git revision into disposable projects.

## Publish and install

After the checks pass, tag the merged revision and push the tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

From the consuming project, substitute your GitHub owner and repository:

```bash
memerig init --template team-backend --registry "gh:OWNER/REPO#v1.0.0"
memerig workflow --template team-review --marketplace "gh:OWNER/REPO#v1.0.0"
```

Create a new tag for each release. Consumers can keep their existing tag until they decide to upgrade. CI runs on tags as well as branches and pull requests.
