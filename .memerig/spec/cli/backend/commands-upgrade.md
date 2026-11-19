# `memerig upgrade` Command

How `memerig upgrade` upgrades the globally installed MemeRig CLI package.

This command is intentionally separate from `memerig update`:

- `memerig upgrade` updates the **CLI binary** by running npm's global install.
- `memerig update` updates a **project's bundled MemeRig files** under `.memerig/`
  and platform directories.

---

## User-facing contract

```text
memerig upgrade [--tag <tag-or-version>] [--dry-run]
```

Behavior:

- Builds and runs `npm install -g memerig@<tag>`.
- POSIX execution must spawn `npm` directly without shell execution.
- Windows execution must route through `cmd.exe /d /s /c npm install -g ...`
  instead of directly spawning `npm.cmd`.
- Uses the current CLI channel by default:
  - stable versions install `@latest`
  - `-beta.*` versions install `@beta`
  - `-rc.*` versions install `@rc`
- `--tag <tag-or-version>` overrides the inferred channel. Accept simple npm
  dist-tags or versions such as `latest`, `beta`, `rc`, or `0.6.0-beta.8`.
- `--dry-run` prints the exact npm command and exits without changing anything.

The implementation does not detect or preserve the original installer. MemeRig
is published as an npm package, so npm is the upgrade backend even when the user
installed Node through pnpm, Homebrew, Volta, proto, or another manager.

---

## Failure behavior

- If npm is unavailable, fail with the manual npm command.
- If npm exits non-zero, surface the exit code.
- If npm is interrupted by a signal, report the signal.
- Append troubleshooting guidance for npm global prefix / PATH mismatches,
  permissions, existing-bin or locked-file conflicts, and the manual command.
- Do not automatically run `sudo`, pass `--force`, rewrite npm prefix, delete
  files, or detect package managers.
- Reject shell-shaped `--tag` input before spawning npm. Never build a shell
  command string for POSIX execution.

## Success behavior

After npm reports success, print both:

```text
memerig --version
```

and a platform-specific binary-resolution check:

```text
which memerig   # POSIX
where memerig   # Windows
```

This catches the common case where npm installed into one global prefix while
the user's shell still resolves an older `memerig` binary earlier on PATH.

---

## Update hints

Any user-facing hint that previously said:

```text
npm install -g memerig@latest
```

should now prefer:

```text
memerig upgrade
```

This applies to CLI startup warnings, `memerig update` downgrade guidance, and
session-start update hints.

---

## Test requirements

- Tag inference: stable → `latest`, beta → `beta`, RC → `rc`.
- Explicit tag override.
- Invalid tag rejection.
- POSIX direct npm command with `shell: false`.
- Windows `cmd.exe /d /s /c npm ...` command plan with `shell: false`.
- Dry-run does not spawn npm.
- Non-zero npm exit becomes a command failure with troubleshooting guidance.
