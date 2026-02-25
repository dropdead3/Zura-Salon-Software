

## Fix: Remove Full Page Reload on Service Provider Toggle

### Problem
Line 132 in `MyProfile.tsx` calls `window.location.reload()` after toggling the stylist role. This causes a full server/page refresh, losing scroll position and providing a jarring experience.

### Root Cause
The original implementation couldn't find a way to refresh the auth context roles, so it fell back to a hard reload. However, `AuthContext` already exposes a `refreshRoles()` function that re-fetches roles from the database and updates state in place.

### Fix
**File: `src/pages/dashboard/MyProfile.tsx`** — `toggleStylistRole` mutation `onSuccess` handler (lines 120-133)

Replace the dead-end dynamic import and `window.location.reload()` with a direct call to `refreshRoles()` from the existing `useAuth()` hook:

1. Destructure `refreshRoles` from the `useAuth()` hook (already imported at top of component)
2. In `onSuccess`, call `await refreshRoles()` instead of `window.location.reload()`
3. Keep the `queryClient.invalidateQueries` calls for any React Query caches
4. Remove the dead import attempt code (lines 124-128)

Result: toggling the switch updates roles in-place with no page reload, no scroll loss, and immediate UI response.

