

## Fix: Edit/Preview Toggle Sizing in Canvas Header

### Problem
The Edit/Preview segmented toggle appears oversized relative to the viewport and zoom controls in the same header strip. The screenshot shows large icon containers with text labels that break the visual rhythm of the 12px-tall control strip.

### Root Cause
The toggle buttons use `px-2.5 gap-1.5` with both an icon (`h-3.5 w-3.5`) and a text label, making them wider and taller-feeling than the adjacent viewport buttons which are icon-only at `px-2`. The two controls should share the same visual density.

### Fix

**File: `src/components/dashboard/website-editor/panels/CanvasHeader.tsx`**

1. **Match viewport button sizing** — Change Edit/Preview buttons from `px-2.5 gap-1.5` to `px-2 gap-1` to match the viewport toggles
2. **Shrink icons** — Reduce from `h-3.5 w-3.5` to `h-3 w-3` for tighter proportions inside the segmented control
3. **Always show labels** — Remove `hidden sm:inline` so the labels are always visible (they're short enough), and keep them at `text-[11px]` but tighten up
4. **Reduce label size** — Use `text-[10px]` to match the zoom controls' text sizing for visual consistency across the strip

The result: Edit/Preview toggle matches the compact density of the viewport and zoom controls, fitting cleanly in the header bar without dominating it.

