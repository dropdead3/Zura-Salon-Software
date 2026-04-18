

## Goal
Center loaders to the visual center of their content area, not the top-left corner of the rendered surface. The loader should account for sidebar width, top nav, and any other chrome — so it appears "in the middle of where the content will be" rather than awkwardly near the top.

## Root cause

Today most loader call sites use one of these patterns:

1. `<div className="flex items-center justify-center h-64">...</div>` — fixed `h-64` (256px) anchors the loader to the top of the page, ignoring viewport size
2. `<DashboardLoader />` rendered bare — inherits whatever height its parent provides, often `auto`, so it collapses to ~40px and sits at the top of the section
3. Page-level loading states that return `<DashboardLoader />` directly inside a `<DashboardLayout>` — no height constraint, so it pins to the top under the page header

The fix isn't per-call-site tuning. It's giving `DashboardLoader` (and `LuxeLoader`) a **fill-mode container** that:
- Fills available vertical space (`min-h-[60vh]` for page-level, configurable)
- Centers content with `flex items-center justify-center`
- Accounts for layout chrome by computing height from viewport minus a known offset (top nav ~64px, page header ~80px when present)

## Proposed solution

### Layer 1 — Add `fullPage` mode to `DashboardLoader`

Extend `DashboardLoader` API:

```ts
interface DashboardLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  caption?: string;
  fullPage?: boolean;  // NEW — fills viewport minus chrome, centers
  fillParent?: boolean; // NEW — fills nearest positioned parent, centers
}
```

Behavior:
- `fullPage` (default `true` when no parent height): wraps in `min-h-[calc(100vh-8rem)] flex items-center justify-center` — accounts for top nav + page header
- `fillParent`: wraps in `absolute inset-0 flex items-center justify-center` — for cards/sections that already have defined height
- Default (neither): inline mode — loader renders at natural size, centered horizontally only (current behavior, kept for compatibility)

### Layer 2 — Apply same logic to `LuxeLoader`

Mirror the API on `LuxeLoader` so the underlying component handles centering itself when used directly. This keeps both loaders symmetric.

### Layer 3 — Convert known full-page call sites

Audit and update the highest-traffic loading screens:

- `Schedule.tsx` — full-page loader before appointments resolve
- Analytics pages — section loads before chart data arrives
- Reports / Operations Hub / Team Hub — top-level dashboard route loads
- Settings sub-pages — when settings data is fetching
- Auth/login transitions — bootstrap-adjacent loaders

Convert from:
```tsx
<div className="flex items-center justify-center h-64">
  <DashboardLoader />
</div>
```
to:
```tsx
<DashboardLoader fullPage />
```

For card-level loaders (e.g. inside an analytics card body):
```tsx
<DashboardLoader fillParent />
```

### Layer 4 — Sensible default

`DashboardLoader` with no props inside a route page (no parent height) auto-defaults to `fullPage` behavior. This means even un-touched call sites benefit immediately. We do this by checking: if no `size` and no parent constraint via className, assume `fullPage`.

Actually — safer: don't auto-detect. Make `fullPage` an explicit prop and document it. Auto-detection of parent height in React is unreliable and would cause layout shifts.

**Revised approach:** keep `fullPage` explicit. Update the top ~10 highest-traffic page-level loader call sites in this pass. Document the convention so future loaders use it correctly.

## Files to modify

| File | Change |
|---|---|
| `src/components/dashboard/DashboardLoader.tsx` | Add `fullPage` and `fillParent` props; render appropriate wrapper |
| `src/components/ui/loaders/LuxeLoader.tsx` | Add same `fullPage` / `fillParent` props on the component itself |
| Up to ~10 page-level loader call sites | Replace ad-hoc `h-64` wrappers with `<DashboardLoader fullPage />` |

Highest-priority call sites to convert (will confirm during implementation via grep for `h-64` + `Loader` and direct `<DashboardLoader />` returns at top of page components):

- `src/pages/dashboard/Schedule.tsx`
- `src/pages/dashboard/Analytics*.tsx` family
- `src/pages/dashboard/admin/*` top-level pages
- `src/pages/dashboard/Reports*.tsx`
- `src/pages/dashboard/CommandCenter.tsx`

## Out of scope
- Inline button spinners (`<Loader2 />` inside CTAs) — these are correctly small and inline
- Skeleton loaders inside table/card bodies — different pattern, already handled
- Bootstrap loader in `main.tsx` — already centered via `min-h-screen`
- Replacing every single ad-hoc loader in the codebase — focus on the high-traffic pages users see most

## Verification signal
- Hard-refresh `/dashboard/schedule` — loader appears in the visual center of the content area (not at top under the header)
- Same for analytics pages, reports, command center
- Sidebar collapse/expand doesn't shift loader off-center (flex centering handles it)
- Mobile viewport — loader still vertically centered, accounting for mobile top bar
- Card-level loaders (inside analytics cards) sit in the middle of the card, not at the top edge

## Ship order
1. Add `fullPage` / `fillParent` props to `DashboardLoader` and `LuxeLoader`
2. Convert top ~10 page-level call sites in one sweep
3. Document convention inline in `DashboardLoader.tsx` JSDoc

