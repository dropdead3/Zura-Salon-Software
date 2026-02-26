

## Show 0 for Services and Retail when no POS sales exist today

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

**Lines 821-823** — Update the fallback logic to match the pattern already applied to Transactions, Avg Ticket, and Rev/Hour:

```tsx
// Before
const showActual = isToday && todayActual?.hasActualData;
const svcRevenue = showActual ? todayActual.actualServiceRevenue : displayMetrics.serviceRevenue;
const prodRevenue = showActual ? todayActual.actualProductRevenue : displayMetrics.productRevenue;

// After
const svcRevenue = isToday
  ? (todayActual?.hasActualData ? todayActual.actualServiceRevenue : 0)
  : displayMetrics.serviceRevenue;
const prodRevenue = isToday
  ? (todayActual?.hasActualData ? todayActual.actualProductRevenue : 0)
  : displayMetrics.productRevenue;
```

This ensures the Services and Retail sub-cards show only actual POS-recorded revenue for today, displaying 0 when no transactions have been synced yet. Non-today date ranges continue to use appointment-based estimates as before.

### Files changed
- `src/components/dashboard/AggregateSalesCard.tsx` — 3 lines updated

