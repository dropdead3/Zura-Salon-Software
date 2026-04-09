

# Fix Dashboard Bento Grid Responsiveness

## Problem
Line 756 in `DashboardHome.tsx` hardcodes `lg:grid-cols-4` for the compact/simple analytics grid. With 9 cards, this produces a 4-4-1 layout with dead space on the last row. A 3×3 grid would be the correct bento layout.

Additionally, the `BentoGrid` component itself only handles a naive 2-row split (`ceil(count/2)` top, rest bottom), which produces lopsided layouts for counts like 7 (4+3), 9 (5+4), or 11 (6+5) instead of even multi-row distribution.

## Fix

### 1. `DashboardHome.tsx` — Dynamic column count for compact grid (line 756)
Compute the optimal column count based on card count:
- 1-3 cards → match card count (1/2/3 cols)
- 4 cards → 4 cols (single row)
- 5-6 cards → 3 cols (2×3 or 3+2 adjusted)
- 7-9 cards → 3 cols (3×3 perfect for 9)
- 10-12 cards → 4 cols
- 13+ cards → 4 cols

The key insight: choose a column count where the last row is either full or has at most 1 empty cell. Replace the hardcoded class with a computed one.

```tsx
const colCount = pinnedCardIds.length <= 3 ? pinnedCardIds.length
  : pinnedCardIds.length <= 4 ? 4
  : pinnedCardIds.length <= 9 ? 3
  : 4;

<div className={cn(
  "grid grid-cols-1 sm:grid-cols-2 gap-4",
  colCount === 3 && "lg:grid-cols-3",
  colCount === 4 && "lg:grid-cols-4",
)}>
```

### 2. `bento-grid.tsx` — Proper multi-row distribution
Replace the 2-row split with a true multi-row algorithm:
- Compute `rowCount = Math.ceil(count / maxPerRow)`
- For even distribution, compute optimal items per row so all rows are balanced (e.g., 9 items / 3 max = 3 rows of 3; 7 items / 4 max = rows of 4+3)
- Render each row as a flex row

This fixes every consumer of `BentoGrid` across the app (13 files), not just the dashboard.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/dashboard/DashboardHome.tsx` | Dynamic `lg:grid-cols-N` based on card count |
| `src/components/ui/bento-grid.tsx` | Multi-row distribution algorithm |

