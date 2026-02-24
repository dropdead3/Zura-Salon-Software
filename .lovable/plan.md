

## Fix: Exclude Deleted/Zero-Price Ghost Appointments from Drilldowns

### Root Cause

Eric Day's appointments were not fully deleted -- they still exist in the `phorest_appointments` table with statuses `booked` and `confirmed` but `total_price = null`. The Services By Stylist drilldown query only excludes `cancelled` and `no_show` statuses, so these ghost records slip through and inflate service counts.

**Revenue impact:** None. The main revenue queries already filter out null-price records. But the drilldown shows Eric Day as "2 services, $0" which is misleading.

### What Needs to Change

Two options to fix this, applied together:

**1. Filter out null-price appointments from drilldown queries**

The `useServiceProductDrilldown` hook (and similar drilldown hooks) should add `.not('total_price', 'is', null)` to match the main sales query pattern. This ensures ghost records with no financial data never appear in revenue breakdowns.

Affected hooks:
- `src/hooks/useServiceProductDrilldown.ts` -- add `.not('total_price', 'is', null)` to the query (line 29)
- `src/hooks/useAvgTicketByStylist.ts` -- same filter addition (line 39)
- `src/hooks/useRevenueByCategoryDrilldown.ts` -- same filter addition (line 53)
- `src/hooks/useGoalPeriodRevenue.ts` -- same filter addition (line 28)

**2. Also exclude `completed`-status check for today's non-revenue appointments**

For the "Today" view specifically, appointments with status `booked` or `confirmed` that have null pricing should not count as revenue-generating. The null-price filter handles this automatically.

### Technical Details

Each hook gets a single line addition to the Supabase query chain:

```typescript
// Before
.not('status', 'in', '("cancelled","no_show")')

// After
.not('status', 'in', '("cancelled","no_show")')
.not('total_price', 'is', null)
```

This aligns all drilldown hooks with the same data integrity standard used by the main `useSalesMetrics` query, which already has this filter.

### Data Verification

The 4 Eric Day appointments for today all have `total_price = null`, so adding this filter will correctly exclude them from all revenue drilldowns while keeping the main revenue totals unchanged (since they already exclude null prices).

No database changes needed -- this is purely a query-level fix.

