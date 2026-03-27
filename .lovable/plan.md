

# Fix: Command Center Nav Always Appearing Active

## Problem
The Command Center link (`/dashboard`) stays highlighted on every page because of a `startsWith` match bug.

When resolving the nav link:
1. `href = '/dashboard'` → `.replace(/^\/dashboard/, '')` → `''`
2. `dashPath('')` → `/org/{slug}/dashboard`
3. `isActive` check: `location.pathname.startsWith('/org/{slug}/dashboard/')` → **true for ALL dashboard pages**

Every sub-route like `/org/{slug}/dashboard/stats` starts with `/org/{slug}/dashboard/`, so Command Center is always "active."

## Fix

**File:** `src/components/dashboard/SidebarNavContent.tsx` (line 286, and the duplicate at line 641)

Add an exact-match guard for the dashboard root path. When `resolvedHref` is the base dashboard path (no trailing segments), only match on exact equality — never `startsWith`:

```tsx
// Before
const isActive = location.pathname === resolvedHref || location.pathname.startsWith(resolvedHref + '/');

// After
const isExactRoot = resolvedHref === dashPath('') || resolvedHref === dashPath('/');
const isActive = isExactRoot
  ? location.pathname === resolvedHref
  : location.pathname === resolvedHref || location.pathname.startsWith(resolvedHref + '/');
```

Same fix applied in both `NavItem` render (line ~286) and the collapsible group item render (line ~641).

## Files Changed
- **Modified:** `src/components/dashboard/SidebarNavContent.tsx` — two lines updated

