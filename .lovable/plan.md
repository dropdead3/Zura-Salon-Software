

## Show grayed-out donut with 0% metrics when no sales

### Current behavior
When `total === 0`, the `RevenueDonutChart` returns an empty state with just "No data" text, losing the visual structure of the card.

### Proposed change
Replace the "No data" empty state with a grayed-out donut ring and the full legend showing 0% for both Services and Retail (plus 0% Retail % and 0%/— Attach Rate). This keeps the card layout consistent whether or not sales exist.

### Implementation

**File: `src/components/dashboard/sales/RevenueDonutChart.tsx`**

1. **Add a placeholder data array for the empty donut** (a single gray segment filling the full ring):
```tsx
const emptyData = [{ name: 'Empty', value: 1, color: 'hsl(var(--muted))' }];
```

2. **Replace the "No data" empty state block (lines 59-67)** with the same full layout used for the data state, but using `emptyData` for the donut and hardcoding 0% for all metrics. The donut renders with `hsl(var(--muted))` fill so it appears as a subtle gray ring.

3. **Adjust the percentage calculations** (line 40) to handle `total === 0` gracefully — already does (`servicePercent` = 0), so the legend will naturally show 0%/0%.

Concretely, the empty-state block becomes the same `flex items-center gap-4` layout with the gray donut on the left and the 0% legend on the right, maintaining visual structure.

### Files changed
- `src/components/dashboard/sales/RevenueDonutChart.tsx` (replace empty state with grayed-out donut + 0% legend)

