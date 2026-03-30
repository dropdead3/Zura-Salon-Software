

## Auth Redirect Bug Fixes

Three related issues in the login redirect flow that can cause broken deep-links and infinite spinners.

---

### Bug 1: `from` state shape mismatch (broken deep-links)

**Problem:** `LegacyDashboardRedirect` passes `state.from` as a plain string (`'/dashboard/schedule'`), but both `UnifiedLogin.tsx` and `StaffLogin.tsx` read `location.state?.from?.pathname` — expecting a Location object. Result: post-login redirect always falls back to `/dashboard`, losing the original deep link.

**Fix (Option A — fix the sender):** Change `LegacyDashboardRedirect` and `ProtectedRoute` to pass `from` as a Location-like object:
```tsx
// OrgDashboardRoute.tsx line 72
state={{ from: { pathname: `/dashboard/${path}` }, message: '...' }}
```

Note: `ProtectedRoute` already passes `location` (a Location object) in `state.from`, so that's correct. Only `LegacyDashboardRedirect` needs fixing.

**File:** `src/components/OrgDashboardRoute.tsx` — line 72

---

### Bug 2: Infinite spinner for authenticated users with no organization

**Problem:** If a logged-in user has no `effectiveOrganization` (no employee profile, no org membership), the fallback at lines 80-85 spins forever.

**Fix:** After a brief wait or immediately, redirect to `/login` with a message, or show an error state explaining no organization was found.

**File:** `src/components/OrgDashboardRoute.tsx` — lines 76-85

**Approach:** Use `isLoading` from `OrganizationContext` to distinguish "still loading" from "loaded but empty." When org context is done loading and slug is still empty, redirect to login with a descriptive message or show an inline error.

---

### Bug 3: `state.message` is never displayed

**Problem:** `LegacyDashboardRedirect` passes `message: 'Please sign in to access your dashboard.'` in navigation state, but neither login page reads or renders it.

**Fix:** In `UnifiedLogin.tsx`, read `location.state?.message` and display it as a toast or inline alert on mount.

**File:** `src/pages/UnifiedLogin.tsx` — add a `useEffect` near line 101 that shows a toast when `location.state?.message` is present.

---

### Summary of changes

| File | Change |
|------|--------|
| `src/components/OrgDashboardRoute.tsx` | Fix `from` to be `{ pathname: ... }` object; add org-not-found redirect instead of infinite spinner |
| `src/pages/UnifiedLogin.tsx` | Display `state.message` as toast on mount |

Three targeted fixes, no architectural changes.

