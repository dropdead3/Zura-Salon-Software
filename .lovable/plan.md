

## Add Timeout Redirect to Login from Legacy Dashboard Spinner

### Problem
When an unauthenticated user hits `/dashboard/*`, `LegacyDashboardRedirect` waits for `effectiveOrganization` which never resolves without a session. The result is an infinite spinner with no explanation.

### Solution
Add auth awareness to `LegacyDashboardRedirect`. If no user session exists after auth loading completes, redirect to `/login` with a toast or state message explaining why.

### Changes

**File: `src/components/OrgDashboardRoute.tsx`**

1. Import `useAuth` from `@/contexts/AuthContext` and `Navigate` (already imported).
2. In `LegacyDashboardRedirect`, after the platform redirect check:
   - Read `{ user, loading }` from `useAuth()`
   - If `loading` is true, show the spinner (auth still resolving)
   - If `loading` is false and `user` is null, redirect to `/login` with location state so the login page can show a message like "Please sign in to access your dashboard"
   - Otherwise, keep existing behavior (wait for org slug, then redirect)

This is a ~10-line change in a single file. No new components needed — the login page already accepts `state.from` for post-login redirect.

