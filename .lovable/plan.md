

## Fix: Tip Inflation from Phorest Multi-Service Appointment Duplication

### Root Cause

Phorest records the **same tip amount on every service line item** within a multi-service appointment. For example, a client who tips $228 on a 3-service visit has $228 recorded on each of the 3 appointment rows. The current code sums all rows naively, counting that tip 3 times ($684 instead of $228).

**Today's data:**
- $228 tip duplicated across 3 services = counted as $684 (inflated by $456)
- $20 tip duplicated across 2 services = counted as $40 (inflated by $20)
- $82.50 tip on 1 service = counted correctly

**Displayed: $807. Actual: $330.50.** The total is inflated by ~2.4x.

This affects:
1. The "Total Tips" metric on the Sales Overview card
2. The "Avg Tip Rate" percentage
3. The Tips Drilldown panel (per-stylist tip totals and averages)
4. The Tips by Payment Method breakdown

### Fix Strategy

Deduplicate tips using the composite key `(phorest_staff_id, phorest_client_id, appointment_date, tip_amount)`. When multiple rows share this key, only count the tip once.

### Files to Change

**1. `src/hooks/useSalesData.ts`**
- Add `phorest_client_id` to the select query (line 245)
- Replace the naive `reduce` sum (lines 291-294) with a deduplication step:
  - Build a Set of seen tip keys: `${phorest_staff_id}|${phorest_client_id}|${appointment_date}|${tip_amount}`
  - Only add the tip to the total when the key is first seen

**2. `src/hooks/useTipsDrilldown.ts`**
- Add `phorest_client_id` and `appointment_date` to the select query (line 58)
- In the aggregation loop (lines 121-140), deduplicate tip amounts using the same composite key before adding to per-stylist and per-category totals

### What This Does NOT Change

- Service revenue totals (unaffected -- each service row has its own `total_price`)
- Product revenue (sourced from `phorest_transaction_items`, separate table)
- Appointment counts (correctly counted per row)

### Expected Outcome

After the fix, today's Tips card should show approximately **$331** instead of $807, and the Avg Tip Rate should drop from ~49% to ~20% -- a realistic salon tip rate.

