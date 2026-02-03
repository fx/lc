# Copilot Review Instructions

## Intentional Patterns (Do Not Flag)

- **`server.allowedHosts: true` in vite.config.ts** - Intentional for development in remote/containerized environments (Coder workspaces, Codespaces, etc.) where the hostname is dynamic
- **`server.host: '0.0.0.0'`** - Required for external access in containerized dev environments

## Task Completion Verification

When reviewing PRs, verify that any tasks completed by the PR are properly marked in `docs/PROJECT.md`:

1. **Check PR changes** - Identify what features or fixes the PR implements
2. **Cross-reference PROJECT.md** - Find matching tasks in the Tasks section
3. **Verify task completion** - Ensure matching tasks are:
   - Marked with `[x]` checkbox (tasks stay in Tasks section with [x])
   - Include PR number on the feature line: `- [x] Feature: Name (PR #N)`

**NOTE:** This project marks tasks complete with `[x]` in the Tasks section. The Completed section is for historical/archived features only. Do NOT suggest moving in-progress features to Completed.

## Review Checklist

- [ ] If PR implements a task from `docs/PROJECT.md`, that task must be marked `[x]` with PR number
- [ ] No orphaned tasks (PR completes work but doesn't update PROJECT.md)
