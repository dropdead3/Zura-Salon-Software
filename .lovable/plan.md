

## Problem

The "Efficiency by Stylist" panel shows all stylists at once, which creates an excessively long list for organizations with large rosters (18+ staff visible in screenshot). Needs to cap at 10 visible rows with scroll for the rest.

## Plan

**File: `src/components/dashboard/sales/RevPerHourByStylistPanel.tsx`**

1. Wrap the stylist list in a `ScrollArea` with `max-h` set to accommodate ~10 rows (~400px based on ~40px per row)
2. Keep the header ("Efficiency by Stylist" + "Salon avg") outside the scroll area so it stays fixed
3. Import `ScrollArea` from `@/components/ui/scroll-area`

The change is ~5 lines — wrap the existing `div.space-y-1` containing the `.map()` in a `ScrollArea` with a max height constraint.

### Files modified
- `src/components/dashboard/sales/RevPerHourByStylistPanel.tsx`

