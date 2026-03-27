

# Fix: Deduplicate Insights Across Wizard Intents

## Problem
The wizard intents filter on overlapping dimensions — `failing` filters by severity, `quick_wins` by effort level, while `revenue`/`team`/`retention` filter by category. A single insight can match multiple intents (e.g., a critical revenue insight appears in both "Where am I failing?" and "Revenue opportunities"). Only "Show me everything" should aggregate all data.

## Solution
Make the category-based intents (`revenue`, `team`, `retention`) exclude items already claimed by `failing` and `quick_wins`. Apply a priority waterfall:

1. **Failing** — claims all `critical` + `warning` severity items
2. **Quick wins** — claims all `quick_win` effort items NOT already claimed by `failing`
3. **Revenue / Team / Retention** — filter by category, excluding anything claimed by `failing` or `quick_wins`
4. **Everything** — no filter (unchanged)

## Changes

**File:** `src/components/dashboard/AIInsightsDrawer.tsx`

Update the `filter` functions in `WIZARD_INTENTS`:

```tsx
// Helper: items claimed by higher-priority intents
const isClaimed = (i: InsightItem) =>
  i.severity === 'critical' || i.severity === 'warning' || i.effortLevel === 'quick_win';

const WIZARD_INTENTS: IntentConfig[] = [
  {
    key: 'failing',
    filter: (insights) => insights
      .filter(i => i.severity === 'critical' || i.severity === 'warning')
      .sort(...),
  },
  {
    key: 'quick_wins',
    filter: (insights) => insights
      .filter(i => i.effortLevel === 'quick_win'
        && i.severity !== 'critical' && i.severity !== 'warning')
      .sort(...),
  },
  {
    key: 'revenue',
    filter: (insights) => insights
      .filter(i => (i.category === 'revenue_pulse' || i.category === 'cash_flow')
        && !isClaimed(i)),
  },
  {
    key: 'team',
    filter: (insights) => insights
      .filter(i => (i.category === 'staffing' || i.category === 'capacity')
        && !isClaimed(i)),
  },
  {
    key: 'retention',
    filter: (insights) => insights
      .filter(i => i.category === 'client_health' && !isClaimed(i)),
  },
  {
    key: 'everything',
    filter: (insights) => insights, // unchanged
  },
];
```

This ensures each insight appears in exactly one intent bucket, with `everything` as the only aggregation view. The count badges on the wizard cards will also update automatically since they use the same filter functions.

## Files Changed
- **Modified:** `src/components/dashboard/AIInsightsDrawer.tsx` — update 4 filter functions + add `isClaimed` helper

