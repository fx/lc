# Copilot Review Instructions

## Intentional Patterns (Do Not Flag)

- **`server.allowedHosts: true` in vite.config.ts** - Intentional for development in remote/containerized environments (Coder workspaces, Codespaces, etc.) where the hostname is dynamic
- **`server.host: '0.0.0.0'`** - Required for external access in containerized dev environments

## Task Completion Verification

When reviewing PRs, verify that any tasks completed by the PR are properly marked in `docs/PROJECT.md`:

1. **Check PR changes** - Identify what features or fixes the PR implements
2. **Cross-reference PROJECT.md** - Find matching tasks in the Tasks section
3. **Verify task completion** - Ensure matching tasks are:
   - Moved to the Completed section
   - Marked with `[x]` checkbox
   - Include PR number: `- [x] Task name (PR #N)`

## Review Checklist

- [ ] If PR implements a task from `docs/PROJECT.md`, that task must be marked complete in the PR
- [ ] Completed tasks include the PR number reference
- [ ] No orphaned tasks (PR completes work but doesn't update PROJECT.md)

## Failure Conditions

**Request changes** if:
- PR implements a feature listed in PROJECT.md but doesn't mark it complete
- PR adds new features without corresponding PROJECT.md tasks
- Completed tasks are missing PR number references
