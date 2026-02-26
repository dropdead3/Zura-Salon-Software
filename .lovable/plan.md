

## Fix: Remove Appointment Fallback -- POS Transaction Data Only

You're right to push back. The Sales Overview card should reflect what actually happened in POS, not synthesized numbers from appointment records. If POS hasn't synced, the card should show $0 -- that's honest data, and it signals that a sync is needed.

### Changes

**File 1: `src/hooks/useTodayActualRevenue.ts`**
- Remove the entire `completedAppointmentsQuery` (lines 59-96) -- no more fallback to `phorest_appointments`
- Remove the fallback logic (lines 188-199) that selects between POS and appointment data
- All values (`actualRevenue`, `actualServiceRevenue`, `actualProductRevenue`, `actualTransactions`) come exclusively from `phorest_daily_sales_summary`
- `actualServiceHours` will be set to 0 when POS has no data (or derived from POS if available)
- `hasActualData` is true only when POS summary has data
- Keep the `lastAppointmentEndTime` query (it's used for "estimated final at" display, not revenue)

**File 2: `src/hooks/useSalesData.ts` -- `useSalesByStylist`**
- Remove the appointment fallback block (lines 465-517) that was just added
- Top Performers leaderboard shows only when `phorest_transaction_items` has data
- If no POS transactions exist for the date range, return empty array (shows "No sales data" which is truthful)

**No changes to `AggregateSalesCard.tsx`** -- it already reads from `todayActual` correctly; once the hook stops lying with appointment data, the card will show honest POS numbers.

### Result
- If POS has synced: all metrics reflect real transaction data
- If POS hasn't synced: metrics show $0 / 0 transactions -- an honest signal that sync is pending
- No more mixing appointment estimates into "actual" sales figures
