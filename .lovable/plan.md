

## Fix: Tips Calculation Bug -- Switch to Appointments Source

### Problem

The Tips metric in the Aggregate Sales Card shows $25,335 -- nearly 50% of total revenue ($54,541). This is clearly wrong.

**Root cause**: Tips are being summed from `phorest_transaction_items`, where Phorest's CSV export duplicates the same tip amount across every line item within a single checkout. A single $88 tip appears on 3 separate rows (service item, sale fee, add-on service), inflating the total by 3-4x.

**Evidence from database investigation**:
- `phorest_transaction_items` with `Math.abs()` on all rows: $25,335 (the incorrect number shown)
- `phorest_appointments.tip_amount` (already fetched but unused): $6,572 (~12% of revenue -- realistic for a salon)

### Fix

**File: `src/hooks/useSalesData.ts` (~lines 263-325)**

Change the `totalTips` calculation in `useSalesMetrics` to use `phorest_appointments.tip_amount` instead of `phorest_transaction_items.tip_amount`:

1. **Remove** the tip accumulation from the transaction items loop (lines 275-279) -- stop summing `tip_amount` from `phorest_transaction_items`
2. **Add** tip summation from the already-fetched appointment data: `data.reduce((sum, apt) => sum + (Number(apt.tip_amount) || 0), 0)`
3. **Return** this appointment-based tip total as `totalTips`

### Technical Detail

The appointment query (line 217) already selects `tip_amount`:
```
.select('id, total_price, tip_amount, service_name, ...')
```

So no additional database query is needed. We simply sum from the data we already have:
```typescript
const totalTipsFromAppointments = data.reduce(
  (sum, apt) => sum + (Number(apt.tip_amount) || 0), 0
);
```

And use `totalTipsFromAppointments` for the `totalTips` return value instead of `totalTipsFromTx`.

The `tipTxSeen` Set and the `totalTipsFromTx` variable related to transaction items can be removed entirely.

### Impact

- Aggregate Sales Card tips display: corrected from ~$25K to ~$6.5K
- Tips drilldown panel (which uses `useTipsDrilldown` hook): unaffected -- that hook reads from `phorest_appointments` already
- No other hooks depend on `totalTips` from `useSalesMetrics` for secondary calculations

