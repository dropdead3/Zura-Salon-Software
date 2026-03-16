

# Stack Feature Cards on Smaller Widths

## Problem
The 6-card feature grid uses `sm:grid-cols-2` (640px breakpoint), but because the cards live inside a constrained content column, they appear compressed at narrower widths.

## Change (`BackroomPaywall.tsx`, line 650)

Update the grid breakpoint from `sm:grid-cols-2` to `lg:grid-cols-2` so the cards stack single-column until the container is wide enough (1024px viewport) to comfortably fit two columns side by side.

```tsx
// Before
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">

// After
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-left">
```

Single line change. The "What You Get" checklist above (line 630) should get the same treatment for consistency: `sm:grid-cols-2` → `lg:grid-cols-2`.

