

## Fix: Sidebar Nav Active State for Org-Scoped Routes

### Problem
The sidebar stores nav hrefs as legacy paths (e.g. `/dashboard/admin/color-bar-settings`), but the actual URL uses org-scoped paths (`/org/drop-dead-salons/dashboard/admin/color-bar-settings`). The `isActive` check does an exact equality comparison against `location.pathname`, so it never matches — the nav item is never highlighted.

### Root Cause
Two locations in `SidebarNavContent.tsx` compute active state without transforming hrefs through `dashPath()`:
- **Line 285** (expanded `NavLink`): `const isActive = location.pathname === href;`
- **Line 639** (collapsed popover): `const isActive = location.pathname === item.href;`

Additionally, navigation calls at lines 291 and 647 pass the raw `href` to `navigate()` instead of the org-scoped version.

### Fix (single file: `SidebarNavContent.tsx`)

1. **`NavLink` inner component (~line 285):** Transform `href` through `dashPath()` for both the active check and the `navigate()` call. Use `startsWith` matching so sub-routes (query params, nested views) also highlight the parent nav item.

2. **Collapsed popover links (~line 639):** Same treatment — resolve `item.href` through `dashPath()` for active state and navigation.

3. **Badge count lookup (~line 589):** The `getBadgeCount` function compares against raw hrefs — this is fine since it matches against the same raw config values, not `location.pathname`.

### Summary
- Transform all sidebar nav hrefs through `dashPath()` before comparing to `location.pathname`
- Use `startsWith` for active matching to cover sub-routes
- Single file change: `src/components/dashboard/SidebarNavContent.tsx`

