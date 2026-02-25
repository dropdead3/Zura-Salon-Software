

## Replace 30/90 Day Toggle with Page Date Filter on Tips Drilldown

Good instinct — the 30/90 day toggle is the only drilldown that ignores the page-level date filter. Every other drilldown (Revenue by Category, Transactions by Hour, Ticket Distribution, etc.) receives `dateFrom`/`dateTo` from the parent `AggregateSalesCard`. The tips drilldown should follow the same pattern.

**No issues with this approach.** When viewing "today," the data will be smaller and the 10-appointment minimum for the Avg Tip Rate Ranking will naturally filter most stylists out — but that's fine because the "Tips by Stylist (total earned)" section has no minimum and will show today's earners. The coaching section will simply be empty on short date ranges, which is correct behavior (you can't coach on a single day's tip rate).

### Changes

**1. Pass `dateFrom`/`dateTo` into the drilldown panel — `AggregateSalesCard.tsx` (~line 1170)**

Add `dateFrom` and `dateTo` props to `TipsDrilldownPanel`, matching the pattern used by every other drilldown:

```tsx
<TipsDrilldownPanel
  isOpen={tipsDrilldownOpen}
  parentLocationId={filterContext?.locationId}
  dateFrom={dateFilters.dateFrom}
  dateTo={dateFilters.dateTo}
/>
```

**2. Accept date props and remove the 30/90 toggle — `TipsDrilldownPanel.tsx`**

- Add `dateFrom` and `dateTo` to the props interface
- Remove the `period` state and the 30/90 toggle UI (lines 30, 139-158)
- Pass `dateFrom`/`dateTo` to the hook instead of `period`

**3. Update the hook to accept `dateFrom`/`dateTo` directly — `useTipsDrilldown.ts`**

- Change `UseTipsDrilldownParams` from `{ period: 30 | 90 }` to `{ dateFrom: string; dateTo: string }`
- Remove the internal `dateFrom`/`dateTo` calculation (lines 47-51) and use the passed values directly
- Query keys already include `dateFrom`/`dateTo`, so caching works correctly

### Behavior by Date Range

| Page Filter | Tips by Stylist | Avg Tip Rate Ranking | Coaching |
|---|---|---|---|
| Today | Shows today's tip earners | Likely empty (no one has 10+ appts today) | Empty |
| This Week | Shows week's earners | May show some stylists | Minimal |
| This Month | Full distribution | Full ranking | Full coaching |
| Custom range | Matches exactly | Matches exactly | Matches exactly |

### What Gets Removed

- The `period` state variable (30/90)
- The 30/90 toggle pill UI
- The internal date calculation in the hook

### Scope

~15 lines removed, ~5 lines added across 3 files. Net reduction in code.

