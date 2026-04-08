

# Auto-Lock Dashboard After 2 Minutes of Inactivity

## Problem
The dashboard has no auto-lock. Users who walk away from the app remain logged in indefinitely, which is a security concern — especially in shared salon environments.

## Approach

### 1. Create `useAutoLock` hook
**New file:** `src/hooks/useAutoLock.ts`

A window-level idle timer that listens for `pointerdown`, `pointermove`, `keydown`, and `touchstart` on `window` (not a container ref like the Dock version). After 2 minutes (120,000ms) of inactivity, calls `lock()` from `DashboardLockContext`.

- Disabled when already locked (`isLocked === true`)
- Disabled when no user is authenticated
- Resets on any interaction event

### 2. Wire into `DashboardLayout.tsx`
Call `useAutoLock()` inside the inner layout component (where `useDashboardLock` is already consumed). One line addition — the hook is self-contained.

### Summary

| Type | Count |
|------|-------|
| New files | 1 (`useAutoLock.ts`) |
| Modified files | 1 (`DashboardLayout.tsx` — add import + one hook call) |

