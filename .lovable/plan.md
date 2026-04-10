

# Audit Pass — Cleanup & Keyboard Shortcut Fix

## Issues Found

### 1. Keyboard shortcuts use hardcoded `/dashboard/...` paths (Bug)
`useKeyboardShortcuts.ts` navigates to legacy paths like `/dashboard/schedule`, `/dashboard/team-chat`, etc. These hit `LegacyDashboardRedirect`, causing a full page reload and redirect hop. The hook should use `useOrgDashboardPath` to build org-scoped paths.

### 2. `useOrganizationApps` hook is dead code (Cleanup)
`src/hooks/useOrganizationApps.ts` has zero consumers after previous refactors. It makes a query to `organization_apps` that nothing uses. Should be deleted.

### 3. `OrgAccessDenied` receives hardcoded `/dashboard` path (Minor)
In `OrgDashboardRoute.tsx` line 70, `myDashboardPath="/dashboard"` is hardcoded. This is acceptable since the user is being denied access to the current org and needs to go back to their own org — `LegacyDashboardRedirect` handles the resolution. No change needed.

### 4. `UnifiedLogin` navigates to `/dashboard` after signup (Acceptable)
Line 391 uses `navigate('/dashboard', { replace: true })`. This is intentional — after login, the user doesn't yet have org context in the URL, so `LegacyDashboardRedirect` resolves it. No change needed.

---

## Proposed Changes

| File | Change |
|------|--------|
| `src/hooks/useKeyboardShortcuts.ts` | Import `useOrgDashboardPath`; replace all hardcoded `/dashboard/...` paths with `dashPath(...)` |
| `src/hooks/useOrganizationApps.ts` | Delete file (zero consumers) |

### Detail: Keyboard shortcuts
Import `useOrgDashboardPath` and call `const { dashPath } = useOrgDashboardPath()`. Replace each handler:
- `navigate('/dashboard')` → `navigate(dashPath('/'))`
- `navigate('/dashboard/schedule')` → `navigate(dashPath('/schedule'))`
- `navigate('/dashboard/team-chat')` → `navigate(dashPath('/team-chat'))`
- `navigate('/dashboard/analytics')` → `navigate(dashPath('/analytics'))`
- `navigate('/dashboard/team')` → `navigate(dashPath('/team'))`
- `navigate('/dashboard/profile')` → `navigate(dashPath('/profile'))`

### Detail: Dead code removal
`useOrganizationApps.ts` queries `organization_apps` but has no importers. Safe to delete.

