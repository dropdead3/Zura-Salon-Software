

# Fix Explore Apps Grid to 2x2 Layout

## Problem

The grid uses `lg:grid-cols-3`, which puts 3 cards on top and 1 orphaned on the bottom row. With 4 cards, a 2x2 layout is correct.

## Change

| File | Change |
|------|--------|
| `src/pages/dashboard/AppsMarketplace.tsx` (line 369) | Change `lg:grid-cols-3` to `lg:grid-cols-2` so 4 cards render as a balanced 2x2 grid |

Single class change on one line.

