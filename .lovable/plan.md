

## Sort Sidebar Favorites by Tab Order Instead of Pin Recency

### Problem

The screenshot shows OPERATIONS appearing above SALES in the sidebar favorites because Operations was pinned more recently. The correct order should match the canonical tab order in the Analytics Hub (e.g., Sales before Operations).

### Change

**`src/hooks/useAnalyticsSubtabFavorites.ts`** -- lines 114-139 (`groupedFavorites` memo)

Replace the current sorting logic that uses insertion index (`orderMap`) with sorting based on the canonical tab order defined in `ANALYTICS_TAB_LABELS`.

The canonical tab order is derived from the keys of `ANALYTICS_TAB_LABELS`:
```
leadership, sales, operations, marketing, campaigns, program, reports, rent
```

Instead of tracking each tab's first-seen index in the favorites array, we build an order index from `ANALYTICS_TAB_LABELS` keys and sort by that. This ensures Sales always appears before Operations regardless of when each was pinned.

### Technical Detail

```typescript
// Current: sorts by first-seen index in favorites array (recency)
const orderMap = new Map<string, number>();
// ...
orderMap.set(fav.tab, idx);
// ...
.sort((a, b) => (orderMap.get(a.tab) ?? 0) - (orderMap.get(b.tab) ?? 0));

// New: sorts by canonical tab position
const TAB_ORDER = Object.keys(ANALYTICS_TAB_LABELS);
// ... (remove orderMap entirely)
.sort((a, b) => {
  const aIdx = TAB_ORDER.indexOf(a.tab);
  const bIdx = TAB_ORDER.indexOf(b.tab);
  return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
});
```

One file, ~5 lines changed. No other files affected.
