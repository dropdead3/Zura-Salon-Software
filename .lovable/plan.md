

# Analytics Audit: Remaining Gaps, Bugs & Enhancements

## Findings

### Bug 1 — `useTodayActualRevenue.tsx` realtime subscription still watches `phorest_daily_sales_summary`
**File:** `src/hooks/useTodayActualRevenue.tsx` (line 47)
The realtime channel subscribes to `phorest_daily_sales_summary` for invalidation. This table is stale. The subscription is harmless but misleading — it should be removed (the `phorest_transaction_items` subscription on line 56 already covers it).

### Bug 2 — `useForecastRevenue.ts` uses raw `total_price` (includes tips) for forecast revenue
**File:** `src/hooks/useForecastRevenue.ts` (line 148)
Revenue is computed as `Number(apt.total_price) || 0` without subtracting `tip_amount`. This was the exact pattern fixed in Batch 1 for other forecast hooks but this file was missed. Should use `total_price - tip_amount`.

### Bug 3 — `useForecastRevenue.ts` queries nonexistent table `phorest_staff_mappings` (plural)
**File:** `src/hooks/useForecastRevenue.ts` (line 126), also `useStaffRebookDrilldown.ts` (line 89)
Both query `phorest_staff_mappings` (plural) — the actual table is `phorest_staff_mapping` (singular). This silently fails, returning no staff names. Should use `resolveStaffNamesByPhorestIds` utility.

### Bug 4 — `useClientEngagement.ts` still uses `total_price` for avg ticket and staff revenue
**File:** `src/hooks/useClientEngagement.ts` (lines 184, 269-271)
Revenue and avg ticket are computed from `phorest_appointments.total_price` (tip-inclusive). Should subtract `tip_amount`, or ideally use transaction items for historical revenue.

### Bug 5 — `useOrganizationAnalytics.ts` still queries `phorest_performance_metrics` for platform analytics
**File:** `src/hooks/useOrganizationAnalytics.ts` (line 222)
This was identified in Phase D but only `useStylistExperienceScore` was fixed. The platform analytics hook still reads stale `phorest_performance_metrics` for rebooking_rate, retention_rate, new_clients. These should be computed from appointments/transactions.

### Bug 6 — `useIndividualStaffReport.ts` still queries `phorest_performance_metrics` (4 queries)
**File:** `src/hooks/useIndividualStaffReport.ts` (lines 272-314)
Staff report pulls rebooking_rate, retention_rate, new_clients from `phorest_performance_metrics`. Should compute these live from appointment data (already has appointment queries in the same hook).

### Enhancement 1 — `fetchAllBatched` utility is duplicated across 10 files
The same pagination helper is copy-pasted in 10 hooks. Should be extracted to a shared utility (e.g., `src/utils/fetchAllBatched.ts`).

### Enhancement 2 — `metricsGlossary.ts` references stale data sources
**File:** `src/data/metricsGlossary.ts` (lines 183, 196, 207, 218, 229, 240, 442, 499)
Eight glossary entries reference `phorest_daily_sales_summary` or `phorest_performance_metrics` as their data source. These should be updated to reflect the actual sources (`phorest_transaction_items`, `phorest_appointments`).

---

## Implementation Plan

### Task 1 — Fix `useTodayActualRevenue.tsx` realtime subscription
Remove the `phorest_daily_sales_summary` subscription block (lines 43-49). Keep only `phorest_transaction_items`.

### Task 2 — Fix `useForecastRevenue.ts` (tip adjustment + table name + staff resolution)
- Subtract `tip_amount` from `total_price` in revenue calculations
- Replace `phorest_staff_mappings` query with `resolveStaffNamesByPhorestIds`
- Select `tip_amount` in the appointment query fields

### Task 3 — Fix `useStaffRebookDrilldown.ts` table name bug
Replace `phorest_staff_mappings` with `resolveStaffNamesByPhorestIds`.

### Task 4 — Fix `useClientEngagement.ts` tip-inclusive revenue
- Add `tip_amount` to the select fields
- Subtract `tip_amount` from `total_price` in all revenue calculations (lines 184, 193, 195, 269, 271)

### Task 5 — Fix `useOrganizationAnalytics.ts` stale performance metrics
Replace the `phorest_performance_metrics` query with live computation from appointments (rebooking from `rebooked_at_checkout`, new clients from `is_new_client`, retail from `phorest_transaction_items`).

### Task 6 — Fix `useIndividualStaffReport.ts` stale performance metrics
Compute rebooking_rate, retention_rate, new_clients from the appointment data already fetched in the same hook. Remove the 4 `phorest_performance_metrics` queries.

### Task 7 — Extract shared `fetchAllBatched` utility
Create `src/utils/fetchAllBatched.ts` and update the 10 files to import from it.

### Task 8 — Update `metricsGlossary.ts` data source references
Update 8 glossary entries to reference correct current data sources.

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bugs (wrong data now) | 4 | `useForecastRevenue`, `useClientEngagement`, `useForecastRevenue`+`useStaffRebookDrilldown` (table name), `useTodayActualRevenue` |
| Bugs (stale on detach) | 2 | `useOrganizationAnalytics`, `useIndividualStaffReport` |
| Enhancements | 2 | `fetchAllBatched` dedup, `metricsGlossary` accuracy |

8 tasks, ~12 files changed, no database changes.

