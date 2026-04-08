

# Fix Dashboard Lock Screen Z-Index

## Problem

The `DashboardLockScreen` renders at `z-50` (line 125), but the sidebar renders at `z-[60]` (line 434). This means the sidebar sits **above** the lock screen, allowing full navigation access while "locked." The God Mode bar also uses `z-[60]`.

## Fix

### File: `src/components/dashboard/DashboardLockScreen.tsx`

**Change 1**: Raise the lock screen z-index from `z-50` to `z-[100]` — above every layer in the z-index hierarchy (sidebar at 60, editor overlays at 70/80, context menus at 90).

Line 125: Change `z-50` → `z-[100]`

### File: `src/components/dashboard/DashboardLayout.tsx`

**Change 2**: Move the `DashboardLockScreen` render position to be the very last element in the component tree (it's already near the end at line 570, but confirm it renders after the sidebar and all overlays — which it does since it's `position: fixed`).

No structural move needed — the z-index fix alone resolves the layering. The `fixed inset-0` positioning already covers the full viewport.

## Summary

| Item | Detail |
|------|--------|
| Root cause | Lock screen z-50 < sidebar z-[60] |
| Fix | Raise to z-[100], above all dashboard layers |
| Files modified | 1 (`DashboardLockScreen.tsx`) |

