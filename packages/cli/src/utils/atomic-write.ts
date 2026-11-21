import fs from "node:fs";
import path from "node:path";

/**
 * Write a file atomically: stream into a temp file in the same directory,
 * then rename it over the target. A crash, Ctrl-C, or ENOSPC mid-write
 * leaves the original file intact (or absent) — never truncated or
 * half-written. The temp file shares the target's directory so the rename
 * stays on one filesystem and is therefore atomic.
 *
 * On failure the temp file is removed on a best-effort basis and the
 * original error is re-thrown.
 */
export function writeFileAtomic(
  filePath: string,
  data: string | Uint8Array,
): void {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // best-effort cleanup; surface the original write error
    }
    throw err;
  }
}

/**
 * Create `filePath` from fully-written content without ever overwriting an
 * existing file. A hard link to the temp file is atomic and fails with
 * `EEXIST` if another process won the create race, so two writers (the TS
 * update flow and `.memerig/scripts/task.py`) cannot silently clobber each
 * other's task.json. Returns `false` when the target already exists.
 *
 * The copy fallback covers filesystems where hard links are unavailable; the
 * content is complete before the exclusive copy starts.
 */
export function writeFileAtomicExclusive(
  filePath: string,
  data: string | Uint8Array,
): boolean {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmp, data);
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // best-effort cleanup
    }
    throw err;
  }
  try {
    try {
      fs.linkSync(tmp, filePath);
      return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EEXIST") return false;
      if (
        code === "EPERM" ||
        code === "ENOSYS" ||
        code === "EXDEV" ||
        code === "EACCES"
      ) {
        try {
          fs.copyFileSync(tmp, filePath, fs.constants.COPYFILE_EXCL);
          return true;
        } catch (copyErr) {
          if ((copyErr as NodeJS.ErrnoException).code === "EEXIST") {
            return false;
          }
          throw copyErr;
        }
      }
      throw err;
    }
  } finally {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // best-effort cleanup
    }
  }
}
