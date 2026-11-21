"""
Cross-platform advisory file locking (standard library only).

Provides:
    file_lock — Exclusive advisory lock on one persistent lock path.

The lock is intentionally a *persistent* path owned by the caller (for the
task store: ``.memerig/tasks/.task.lock``), not a per-operation temp file.
Two processes that need the same store must contend on the same byte range of
the same path; deriving the lock path from the file being written would give
each writer a different lock and serialize nothing.

Usage:
    from common.file_lock import file_lock

    with file_lock(tasks_dir / ".task.lock"):
        ... read, validate, replace ...

POSIX uses ``fcntl.flock``; Windows uses ``msvcrt.locking`` on byte 0. Both
are advisory and released by the operating system when the descriptor closes
or the process exits, so a crashed writer cannot leave the store locked
forever. A caller that cannot acquire the lock within ``timeout`` gets
``TimeoutError`` instead of blocking indefinitely.
"""

from __future__ import annotations

import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

try:  # POSIX
    import fcntl as _fcntl
except ImportError:  # pragma: no cover - Windows
    _fcntl = None

try:  # Windows
    import msvcrt as _msvcrt
except ImportError:  # pragma: no cover - POSIX
    _msvcrt = None


DEFAULT_LOCK_TIMEOUT = 10.0
_LOCK_POLL_INTERVAL = 0.05


@contextmanager
def file_lock(
    path: Path,
    *,
    timeout: float = DEFAULT_LOCK_TIMEOUT,
) -> Iterator[None]:
    """Hold an exclusive advisory lock on ``path`` for the ``with`` body.

    Creates the parent directory and the lock file when missing. The supplied
    path is used exactly as given; no suffix or sibling path is derived.
    Raises ``TimeoutError`` when the lock cannot be acquired within
    ``timeout`` seconds.
    """
    lock_path = Path(path)
    try:
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        handle = open(lock_path, "a+b")
    except OSError as exc:
        raise OSError(f"could not open task lock {lock_path}: {exc}") from exc

    try:
        _acquire(handle, timeout)
        try:
            yield
        finally:
            _release(handle)
    finally:
        handle.close()


def _acquire(handle, timeout: float) -> None:
    deadline = time.monotonic() + max(0.0, timeout)
    if _fcntl is not None:
        while True:
            try:
                _fcntl.flock(handle.fileno(), _fcntl.LOCK_EX | _fcntl.LOCK_NB)
                return
            except (BlockingIOError, OSError):
                if time.monotonic() >= deadline:
                    raise TimeoutError("timed out waiting for the task lock")
                time.sleep(_LOCK_POLL_INTERVAL)
    if _msvcrt is not None:
        # msvcrt locks a byte range from the current file position. Make sure
        # byte 0 exists, and lock exactly that byte every time.
        handle.seek(0, 2)
        if handle.tell() == 0:
            handle.write(b"\0")
            handle.flush()
        while True:
            try:
                handle.seek(0)
                _msvcrt.locking(handle.fileno(), _msvcrt.LK_NBLCK, 1)
                return
            except OSError:
                if time.monotonic() >= deadline:
                    raise TimeoutError("timed out waiting for the task lock")
                time.sleep(_LOCK_POLL_INTERVAL)
    raise RuntimeError("no supported file-locking primitive on this platform")


def _release(handle) -> None:
    if _fcntl is not None:
        try:
            _fcntl.flock(handle.fileno(), _fcntl.LOCK_UN)
        except OSError:
            pass
        return
    if _msvcrt is not None:
        try:
            handle.seek(0)
            _msvcrt.locking(handle.fileno(), _msvcrt.LK_UNLCK, 1)
        except OSError:
            pass
