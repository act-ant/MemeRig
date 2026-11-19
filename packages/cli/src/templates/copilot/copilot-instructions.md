<!-- MEMERIG:COPILOT-GUIDANCE:START -->
# MemeRig Review Guidance

When reviewing a MemeRig-enabled repository:

- Treat MemeRig-generated runtime and platform payloads as copied integration files in consumer repositories. Examples include `.memerig/scripts/**`, `.memerig/agents/**`, `.memerig/workflow.md`, and platform MemeRig files under `.agents/**`, `.claude/**`, `.codex/**`, `.cursor/**`, `.gemini/**`, `.github/**`, `.opencode/**`, `.qoder/**`, `.codebuddy/**`, `.factory/**`, `.pi/**`, `.reasonix/**`, `.trae/**`, and `.zcode/**`.
- Do not leave line-by-line style, wording, or local refactor comments on those copied files unless the PR explicitly changes MemeRig integration, the copied file is the primary subject, it leaks secrets, it has syntax or wiring breakage, or it contradicts the PR goal.
- If a MemeRig-generated file needs a behavior change, leave one handoff comment asking for an upstream MemeRig fix. Include the affected path, expected behavior, observed evidence or reproduction steps, and why the fix belongs upstream.
- Continue reviewing repo-owned `.memerig/spec/**`, `.memerig/tasks/**`, application code, migrations, tests, docs, and non-MemeRig scripts normally.
- Group duplicate root-cause findings into one comment and point to a deterministic local check when one already covers the issue class.
<!-- MEMERIG:COPILOT-GUIDANCE:END -->
