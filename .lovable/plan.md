

# Fix Color Bar Metric Calculations — Broken Data Pipeline

## Problem Found

After tracing every query from the Dock app through to the analytics display, I found two critical data pipeline breaks:

### Issue 1: `staff_backroom_performance` table is NEVER populated

The `useStaffComplianceSummary` hook relies on `staff_backroom_performance` for two critical values:
- `total_dispensed_weight` — used as the denominator for **Waste Rate %**
- `total_product_cost` — used to derive cost-per-gram for **Waste Cost $**

**There is no insert or upsert to this table anywhere in the codebase.** The table exists, RLS policies exist, but nothing ever writes to it. This means:
- `totalDispensed` is always **0**
- `costPerGram` is always **0**
- **Waste Rate % is always 0%**
- **Waste Cost $ is always $0.00**

The `waste_events` table IS populated correctly by the Dock (via `useWasteEvents.ts`), so the raw waste quantity data exists — it just can't be turned into a percentage or cost because the denominator is missing.

### Issue 2: Only queries `appointments` table, not `phorest_appointments`

The hook queries only the `appointments` table for color/chemical appointments. For salons using Phorest integration, appointment data lives in `phorest_appointments`. This means:
- `colorAppts` may return 0 results
- All downstream metrics (compliance rate, reweigh rate, overage attachment) return zeros or defaults
- This is the same issue that was previously fixed in `useIndividualStaffReport`

### What IS wired correctly

- **Reweigh Rate**: Correctly checks `mix_bowls.post_service_weight_g > 0` — this is set during the Dock reweigh flow
- **Overage Charges $**: Correctly queries `checkout_usage_charges` by appointment IDs — populated by `useCalculateOverageCharge` on session completion
- **Overage Attachment %**: Logic is correct (appointments with charges / total color appointments) — but broken by Issue 2 (wrong appointment source)

## Solution

### 1. Compute dispensed weight and cost directly from `mix_bowls` + `bowl_lines`

Instead of relying on the unpopulated `staff_backroom_performance` table, calculate totals directly from the source-of-truth operational tables:

- Query `mix_bowls` for sessions → get bowl IDs
- Query `bowl_lines` for those bowls → sum `dispensed_quantity` and `dispensed_quantity * dispensed_cost_snapshot`
- This gives accurate `totalDispensed` and `totalCost` from actual Dock usage

**Waste Rate** = `totalWasteQty / totalDispensed × 100`
**Waste Cost** = `totalWasteQty × (totalCost / totalDispensed)`

### 2. Query both `appointments` AND `phorest_appointments` for color detection

Mirror the pattern already used in `useIndividualStaffReport`:
- Query `phorest_appointments` filtered by staff and date range
- Filter for color/chemical services using `isColorOrChemicalService`
- Merge IDs from both tables for `mix_sessions` cross-reference
- Use the larger set for total color appointment count

### 3. Add a population mechanism for `staff_backroom_performance` (future)

This table is designed as a periodic aggregate/snapshot. For now, bypassing it with direct queries is the correct fix. A future task should add a scheduled job or edge function to populate it.

## Files Changed

| File | Change |
|---|---|
| `src/hooks/color-bar/useStaffComplianceSummary.ts` | Replace `staff_backroom_performance` read with direct `bowl_lines` aggregation; add `phorest_appointments` query for color detection |

1 file modified. No database changes.

## Metric Equations (Corrected)

| Metric | Formula | Data Source |
|---|---|---|
| Waste Rate % | `waste_events.quantity / bowl_lines.dispensed_quantity × 100` | `waste_events` + `bowl_lines` via `mix_bowls` |
| Waste Cost $ | `waste_events.quantity × (Σ cost / Σ dispensed)` | `waste_events` + `bowl_lines` |
| Reweigh Rate % | `sessions_with_reweigh / tracked_sessions × 100` | `mix_bowls.post_service_weight_g > 0` |
| Overage Attachment % | `appointments_with_charge / total_color_appointments × 100` | `checkout_usage_charges` |
| Overage Charges $ | `Σ checkout_usage_charges.charge_amount` | `checkout_usage_charges` |

