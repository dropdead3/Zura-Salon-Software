

## Fix Sidebar Footer Separator Alignment

### Problem

The separator border spans the full width of the sidebar while the footer content (Beta badge, action buttons) is inset with `mx-3` margins. This creates a visual mismatch where the stroke looks misplaced -- it bleeds edge-to-edge instead of aligning with the content it separates.

### Fix

**File: `src/components/dashboard/SidebarNavContent.tsx`** -- line 732

Add horizontal margin (`mx-3`) to the footer container so the border aligns with the inset content below it, and increase top padding slightly (`pt-3`) for better breathing room:

```
// Current (line 732):
<div className="mt-auto shrink-0 flex flex-col gap-2 border-t border-border/40 pt-2">

// Updated:
<div className="mt-auto shrink-0 flex flex-col gap-2 border-t border-border/40 pt-3 mx-3">
```

Since the footer children already have their own `mx-3` margins, those inner margins will need to be removed to prevent double-inset. The Beta badge container (line 744) changes from `mx-3` to no horizontal margin, and the two card containers (lines 752 and 758) also drop their `mx-3`:

- Line 744: `mx-3` removed from expanded Beta badge wrapper
- Line 754: `mx-3` changed to nothing (expanded state) and `mx-2` stays for collapsed
- Line 760: same treatment

For the **collapsed** state, the parent `mx-3` won't work well with the smaller collapsed elements. Instead, a cleaner approach: keep the border container without `mx-3`, but add `mx-3` **only to the border** using a dedicated separator element:

```tsx
{/* Separator */}
<div className="mx-3 border-t border-border/40" />

{/* Footer content unchanged */}
<div className="mt-auto shrink-0 flex flex-col gap-2 pt-2">
```

This places a standalone separator `div` between the `ScrollArea` and the footer, inset by `mx-3` to align with the navigation content. The footer container itself keeps its original classes minus the border.

### Summary

Two changes on line 731-732:
1. Insert a new `<div className="mx-3 border-t border-border/40" />` between `</ScrollArea>` and the footer
2. Remove `border-t border-border/40 pt-2` from the footer div, replace with just `pt-2`

