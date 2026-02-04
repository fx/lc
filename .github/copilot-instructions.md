# Copilot Review Instructions

## Intentional Patterns (Do Not Flag)

- **`server.allowedHosts: true` in vite.config.ts** - Intentional for development in remote/containerized environments (Coder workspaces, Codespaces, etc.) where the hostname is dynamic
- **`server.host: '0.0.0.0'`** - Required for external access in containerized dev environments
- **Simplified wrapper components in route tests** - Test files may define simplified wrapper components that compose actual components (e.g., `SettingsPage` composing `InstanceForm` and `InstanceList`). This is intentional to test component integration without mocking TanStack Router's `createFileRoute`. Do not flag these as "not testing the actual component"
- **Manual `updatedAt` in UPDATE operations** - Drizzle's `defaultNow()` only applies on INSERT. Manual setting in UPDATE handlers is the correct pattern to track modification time
- **React useEffect with multiple dependencies** - Effects that depend on state and callbacks together are not race conditions. React guarantees state consistency within effect execution

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
