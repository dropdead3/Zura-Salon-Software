

## Add Average Tip Rate to Tips Drilldown

### What Changes

Add a summary stat row at the top of the Tips drilldown panel (leadership view) showing the **overall average tip rate** -- the weighted tip percentage across all stylists in the filtered view.

### Implementation

**File: `src/components/dashboard/sales/TipsDrilldownPanel.tsx`**

1. Compute a weighted average tip rate from `filteredStylists` data:
   - Sum all `totalTips` across stylists
   - Sum all `(totalTips / tipPercentage * 100)` to derive total revenue base
   - Calculate `(totalTips / totalRevenue) * 100` for the true weighted rate
   - Alternatively, derive from the raw totals already in the stylist metrics: `sum(totalTips) / sum(appointmentCount)` for avg tip dollar, and weighted tip % from the percentage fields

2. Add a compact summary strip above the "Top Tip Earners" section in the leadership view (after the filter bar, before the stylist list). This will show:
   - **Avg Tip Rate**: e.g. "14.2%" -- the weighted tip-as-percentage-of-revenue across all filtered stylists
   - Displayed in a small inline stat pill, consistent with the existing panel styling

3. For the **self-view**, add "Tip Rate" context alongside the existing 4 metric cards (it already shows "Tip %" which is the same concept, so no change needed there).

### Technical Detail

The `StylistTipMetrics` type already has `tipPercentage` (tips/revenue * 100) and `totalTips` per stylist. To compute the weighted average:

```typescript
const totalTipsSum = filteredStylists.reduce((s, st) => s + st.totalTips, 0);
const totalRevenueBase = filteredStylists.reduce((s, st) => {
  return s + (st.tipPercentage > 0 ? (st.totalTips / st.tipPercentage) * 100 : 0);
}, 0);
const avgTipRate = totalRevenueBase > 0 ? (totalTipsSum / totalRevenueBase) * 100 : 0;
```

This will be rendered as a small summary line like:

```
Overall Avg Tip Rate: 14.2%  |  Total Tips: $19,586
```

Placed between the filter bar and the "Top Tip Earners" heading, using `text-xs text-muted-foreground` styling with the percentage in `font-display` for emphasis.

