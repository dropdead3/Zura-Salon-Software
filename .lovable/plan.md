

# Center Z Loader in Content Area — Universal Fix

## Problem
The ZuraLoader / DashboardLoader appears off-center because it centers within small containers (e.g., `min-h-[400px]`) rather than filling the remaining viewport height. The horizontal centering is already handled by the sidebar's margin on `<main>`, but vertical centering falls short when the container doesn't fill the visible area.

## Solution

Two changes to ensure the loader is always dead-center of the visible content area:

### 1. Update `DashboardLoader` default height
**File: `src/components/dashboard/DashboardLoader.tsx`**

When no explicit height/min-height className is passed, apply `min-h-[60vh]` as the default so the loader vertically centers in a meaningful viewport slice. This ensures every `<DashboardLoader />` call without a size override fills enough space to appear centered.

### 2. Audit and fix call sites using raw `ZuraLoader` inside dashboard
**File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`** (line 1843)

Change `<DashboardLoader className="min-h-[400px]" />` to just `<DashboardLoader />` so it picks up the new default full-height centering.

Scan other dashboard files for similar short containers — any `DashboardLoader` used as a full-page loading state should drop explicit `min-h-[Npx]` overrides and inherit the new default.

### Pre-layout loaders (no change needed)
`OrgDashboardRoute.tsx` and `main.tsx` render loaders before the sidebar exists, so `min-h-screen flex items-center justify-center` is correct for those contexts.

## Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/DashboardLoader.tsx` | Add `min-h-[60vh]` default when no height class provided |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Remove explicit `min-h-[400px]` on page-level loader |
| Various dashboard pages | Audit ~5-10 call sites using `DashboardLoader` as page-level loader to ensure they inherit the default |

No database changes.

