---
description: "MemeRig Copilot prompt: Method 1: Simple parameters"
---

[!] **Prerequisite**: This command should only be used AFTER the human has tested and committed the code.

Read Git history and run the Python scripts. Journal commits follow the project's `session_auto_commit` setting.

---

## Record Work Progress

### Step 1: Get Context & Check Tasks

```bash
python3 ./.memerig/scripts/get_context.py --mode record
```

If the current task meets its acceptance criteria, complete it by UUID or path. If there is no task, proceed to the journal.

```bash
python3 ./.memerig/scripts/task.py complete <task-id>
```

### Step 2: One-Click Add Session

```bash
# Method 1: Simple parameters
python3 ./.memerig/scripts/add_session.py \
  --title "Session Title" \
  --commit "hash1,hash2" \
  --summary "Brief summary of what was done"

# Method 2: Pass detailed content via stdin
cat << 'EOF' | python3 ./.memerig/scripts/add_session.py --stdin --title "Title" --commit "hash"
| Feature | Description |
|---------|-------------|
| New API | Added user authentication endpoint |
| Frontend | Updated login form |

**Updated Files**:
- `packages/api/modules/auth/router.ts`
- `apps/web/modules/auth/components/login-form.tsx`
EOF
```

**Auto-completes**:
- [OK] Appends session to journal-N.md
- [OK] Auto-detects line count, creates new file if >2000 lines
- [OK] Auto-detects Branch context (`--branch` override; otherwise Branch = task.json -> current git branch; missing values are omitted gracefully)
- [OK] Updates index.md (Total Sessions +1, Last Active, line stats, history)
- [OK] Commits workspace journal changes when `session_auto_commit` is enabled

---

## Script Command Reference

| Command | Purpose |
|---------|---------|
| `python3 ./.memerig/scripts/get_context.py --mode record` | Get context for record-session |
| `python3 ./.memerig/scripts/add_session.py --title "..." --commit "..."` | **One-click add session (recommended, branch auto-complete)** |
| `python3 ./.memerig/scripts/task.py complete <task-id>` | Complete task in place |
| `python3 ./.memerig/scripts/task.py list` | List active tasks |
