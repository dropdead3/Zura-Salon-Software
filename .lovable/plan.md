

# Fix Bootstrap Loader: Context-Neutral + Branded

## Problem
The `BootstrapFallback` in `main.tsx` has two issues:
1. Text says "Loading dashboard" -- wrong when loading the marketing site, login, or any non-dashboard surface
2. Uses a generic spinning circle instead of the branded ZuraLoader (the pixel Z-grid)

## Changes

### 1. Update `src/main.tsx` — `BootstrapFallback`
- Replace the generic spinner with the `ZuraLoader` component (static import -- it has zero data dependencies, only uses `cn` and React state)
- Use `platformColors` prop to get the violet accent treatment
- Change text from "Loading dashboard" to just the platform name via `PLATFORM_NAME` from `src/lib/brand.ts`
- Update `BootstrapError` copy from "Zura hit a startup issue before the dashboard could render" to a context-neutral message using the brand token

### 2. Update `src/components/OrgDashboardRoute.tsx` — Route-level loaders
- Replace the 3 instances of `Loader2` spinner with `ZuraLoader` for consistent branded loading across org resolution and legacy redirects

### Technical Notes
- `ZuraLoader` is safe for static import in `main.tsx` -- it depends only on `react`, `cn`, and inline CSS classes (no hooks, no data fetching, no context providers)
- The `platformColors` prop activates the violet-400/violet-500 color scheme that aligns with the platform marketing surface
- No changes to dashboard-internal loaders (those 135+ `Loader2` instances are contextually correct for in-app inline loading states)

