

## Indent Favorite Sublinks and Add Arrow Indicator

A small styling refinement to the favorited subtab links in the sidebar to make them feel more like "quick go" shortcuts.

### Changes

**File: `src/components/dashboard/CollapsibleNavGroup.tsx`**

1. **Increase indentation** -- Change the sublink left padding from `pl-12` to `pl-14` to visually nest them deeper under Analytics Hub, creating clearer hierarchy.

2. **Add right arrow icon** -- Prepend a small `ChevronRight` icon (w-3 h-3) before each sublink label to indicate "quick navigation." This arrow will use `text-muted-foreground/50` by default and inherit the active color when the link is active.

### Visual Result

```text
  [icon] Analytics Hub          (active, pl-9)
           → Staff Performance   (pl-14, with small arrow)
           → Goals               (pl-14, with small arrow)
  [icon] Appointments & Transactions
```

The arrow communicates "this takes you somewhere specific" -- reinforcing that these are deep-link shortcuts rather than sibling pages.

