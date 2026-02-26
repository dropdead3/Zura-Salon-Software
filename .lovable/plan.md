

## Show 0 for secondary KPIs when no POS sales exist today

**Problem**: When viewing today's data and no POS transactions have been synced yet, the Transactions, Avg Ticket, and Rev/Hour cards fall back to appointment-based estimates instead of showing 0. The user expects these to reflect actual completed sales only.

**Root cause**: The ternary `isToday && todayActual?.hasActualData ? actualValue : displayMetrics.value` falls back to `displayMetrics` (appointment-based) when `hasActualData` is false. For these secondary KPIs, the correct fallback for today should be 0, not the appointment estimate.

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

Six value expressions need updating (3 in the "no daily avg" grid at lines 901/920/939, and 3 in the "with daily avg" grid at lines 966/985/1004):

1. **Transactions** (lines 901, 966): Change fallback from `displayMetrics.totalTransactions` to `0` when `isToday`
2. **Avg Ticket** (lines 920, 985): Change fallback from `displayMetrics.averageTicket` to `0` when `isToday`
3. **Rev/Hour** (lines 939, 1004): Change fallback from `revenuePerHour` to `0` when `isToday`

Pattern for each:
```tsx
// Before
isToday && todayActual?.hasActualData ? todayActual.actualTransactions : displayMetrics.totalTransactions

// After — show 0 for today when no POS data, keep appointment fallback for non-today ranges
isToday ? (todayActual?.hasActualData ? todayActual.actualTransactions : 0) : displayMetrics.totalTransactions
```

Same pattern applied to Avg Ticket and Rev/Hour values.

### Files changed
- `src/components/dashboard/AggregateSalesCard.tsx` — 6 value expressions updated

