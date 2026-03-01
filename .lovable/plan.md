

## Revenue Gap Analysis — Gaps and Enhancements

### Issues Found

**1. Missing location filter on gap query (Bug)**

`useScheduledRevenue` correctly filters by `locationId`, but `useRevenueGapAnalysis` does NOT filter appointments or POS items by location. When viewing a single location, the gap drilldown shows appointments from ALL locations. This is inconsistent.

**Fix:** Add `.eq('location_id', locationId)` to the appointment query in `useRevenueGapAnalysis` when a location is selected.

**2. Null `phorest_client_id` appointments are invisible in the gap (Data gap)**

36 completed appointments in February ($3,933) have no `phorest_client_id`. The current code skips them entirely at line 209 (`if (!a.phorest_client_id) return`). These can never match POS records, so they always show as "No POS record" but are silently dropped instead.

**Fix:** Include null-client appointments as individual gap items with reason `no_pos_record` and client name from `client_name` field or "Walk-in".

**3. `useScheduledRevenue` doesn't filter by `is_parent` / deduplicate sub-appointments**

The hook sums `total_price` from ALL appointment rows. If Phorest ever sends parent + child rows for the same booking, revenue would be double-counted. The data currently shows no duplicates (`phorest_id` is unique), but this is a latent risk.

**Fix:** Not urgent — no duplicates exist. Add a comment noting the assumption.

### Enhancements Worth Considering

**4. Gap trend over time**

Right now the drilldown is a flat list. Operators can't see if cancellations are increasing week-over-week. A small sparkline or trend badge showing "Cancellations up 30% vs prior period" would surface operational drift.

**5. Reason filter chips**

When there are 50+ gap items, scanning is hard. Adding filter chips at the top (Cancelled · No-show · No POS · Discount) lets operators focus on one category — especially useful when investigating a specific problem like "why are so many appointments missing POS records."

### Recommended Next Step

Fix issues 1 and 2 — they're data correctness bugs. Issue 1 (location filter) makes single-location views misleading. Issue 2 ($3,933/month in invisible gap items) means the drilldown under-reports the gap.

### Files Modified

| File | Change |
|---|---|
| `src/hooks/useRevenueGapAnalysis.ts` | Add `locationId` parameter to `useRevenueGapAnalysis`, filter appointment + POS queries by location. Handle null-client appointments as `no_pos_record` gap items instead of skipping them. |
| `src/components/dashboard/AggregateSalesCard.tsx` | Pass `filterContext?.locationId` to `useRevenueGapAnalysis` |

### Technical Details

- Location filter: add optional `locationId` param, apply `.eq('location_id', locationId)` when not 'all'
- Null-client handling: after the client-day grouping loop, iterate remaining completed appointments with `phorest_client_id === null`, create gap items with `reason: 'no_pos_record'` using `client_name ?? 'Walk-in'`
- No schema changes needed

