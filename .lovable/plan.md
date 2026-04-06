

# Add Vertical Divider to Frozen "Metric" Column on Scroll

## Problem

The sticky "Metric" column blends into the scrolling content when the table is scrolled horizontally. There's no visual separator to indicate where the frozen column ends.

## Solution

Add a right border/shadow to all sticky `left-0` cells (the Metric column header and all metric label cells) so a visible vertical divider persists during horizontal scroll.

### Change in `StylistLevelsEditor.tsx`

Add a `border-r border-border/40` class to every sticky cell in the Metric column:

1. **Table header** (~line 698): Add `border-r border-border/40` to the sticky `TableHead`
2. **Section header rows** (~line 640): Add `border-r border-border/40` to the sticky `TableCell` in section headers
3. **Commission rows** (~line 756): Same addition
4. **Hourly Wage row** (~line 775): Same addition
5. **Promotion metric rows**: Same addition to all sticky metric label cells

Optionally add a subtle `shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]` for extra depth, but the border alone should suffice given the existing vertical divider system.

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — add `border-r border-border/40` to all `sticky left-0` cells

### No database changes.

