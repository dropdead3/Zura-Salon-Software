

# Analytics Audit Pass 3: Remaining Gaps and Bugs

## Findings

### Bug 1 — `useYearlyGoalProgress.ts` uses raw `total_price` (tip-inclusive, no pagination)
**File:** `src/hooks/useYearlyGoalProgress.ts` (line 48-49)
YTD revenue sums `total_price` without subtracting `tip_amount`. Also no pagination — a full year of appointments could exceed the 1000-row limit, silently truncating revenue. Should switch to `phorest_transaction_items` with `fetchAllBatched` for accurate POS-based YTD revenue.

### Bug 2 — `useServiceProductDrilldown.ts` uses `total_price` for service revenue (tip-inclusive)
**File:** `src/hooks/useServiceProductDrilldown.ts` (line 125)
Service revenue per staff is summed from `total_price` without subtracting `tip_amount`. The tip is already tracked separately (line 127), so the service revenue figure is inflated. Should use `total_price - tip_amount`.

### Bug 3 — `useSalesData.ts` fallback paths still use raw `total_price`
**File:** `src/hooks/useSalesData.ts`
Three fallback/secondary code paths still sum `total_price` without tip adjustment:
- Line 408: Revenue fallback when no transaction data
- Lines 599-600: Location breakdown revenue
- Lines 647, 707-708: `useServiceMix` and `useSalesTrend` — both use raw `total_price` from appointments without tip subtraction or pagination

### Bug 4 — `useRealizationRate.ts` uses raw `total_price` for scheduled revenue (no pagination)
**File:** `src/hooks/useRealizationRate.ts` (line 51)
Scheduled revenue sums `total_price` without subtracting tips. This inflates the scheduled side, making realization rate artificially low. Also no pagination for the appointment query. Should select `tip_amount` and subtract it.

### Bug 5 — `useStaffKPIReport.ts` still queries `phorest_performance_metrics`
**File:** `src/hooks/useStaffKPIReport.ts` (lines 42-47)
This was identified in the prior audit but was NOT fixed. It still reads `rebooking_rate`, `retention_rate`, `new_clients` from the stale `phorest_performance_metrics` table. Should compute these live from appointments (same pattern as `useIndividualStaffReport.ts`).

### Bug 6 — `useStylistExperienceScore.ts` still falls back to `phorest_performance_metrics` for retention
**File:** `src/hooks/useStylistExperienceScore.ts` (lines 118-123, 228-233)
Still queries `phorest_performance_metrics` for retention rates as a fallback. The computed retention from appointments (line 225) is already the primary path, but the stale fallback should be removed and the default should be neutral (50 or 0) when no client data exists.

### Bug 7 — `fetchAllBatched` utility created but not adopted
**File:** `src/utils/fetchAllBatched.ts` exists, but 7 files still define their own local copies. The prior task said it would update 10 files but didn't. The duplicated implementations have subtly different signatures (some take `buildQuery(from, to)`, the shared one takes `queryBuilder()` returning `.range()`).

### Enhancement — `useSalesTrend` and `useServiceMix` should use transaction items
These two functions in `useSalesData.ts` use `total_price` from appointments for historical revenue trends and category mix. For completed dates, they should use `phorest_transaction_items` for accuracy, consistent with the POS-first standard.

---

## Implementation Plan

### Task 1 — Fix `useYearlyGoalProgress.ts`
Switch to `phorest_transaction_items` with `fetchAllBatched`. Sum `total_amount + tax_amount`.

### Task 2 — Fix `useServiceProductDrilldown.ts` tip adjustment
Change line 125 to `(Number(appt.total_price) || 0) - (Number(appt.tip_amount) || 0)`.

### Task 3 — Fix `useSalesData.ts` fallback/secondary paths
- Tip-adjust the `total_price` fallback (line 408)
- Tip-adjust location breakdown (lines 599-600)
- Switch `useServiceMix` to tip-adjusted `total_price - tip_amount` and add `tip_amount` to select
- Switch `useSalesTrend` to tip-adjusted and add `tip_amount` to select
- Add pagination where missing

### Task 4 — Fix `useRealizationRate.ts`
Add `tip_amount` to select, subtract from scheduled revenue calculation. Add pagination.

### Task 5 — Fix `useStaffKPIReport.ts` stale `phorest_performance_metrics`
Remove the `phorest_performance_metrics` query. Compute rebooking from `phorest_appointments.rebooked_at_checkout`, retention from unique/returning clients, new clients from `is_new_client`. Fetch appointments alongside transactions.

### Task 6 — Clean up `useStylistExperienceScore.ts`
Remove the `phorest_performance_metrics` query and `staffRetention` fallback map entirely. Use computed retention only (already the primary path).

### Task 7 — Align `fetchAllBatched` utility signature and adopt
Update the shared utility signature to match the `buildQuery(from, to)` pattern used by the 7 local copies (more ergonomic). Then replace local copies in: `useActualRevenue`, `useExtensionProductRevenue`, `useOperationalAnalytics`, `usePerLocationColorServices`, `useProductCoPurchase`, `useProductVelocity`, `useSalesData`.

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bugs (wrong data now) | 4 | `useYearlyGoalProgress`, `useServiceProductDrilldown`, `useSalesData` (3 paths), `useRealizationRate` |
| Bugs (stale on detach) | 2 | `useStaffKPIReport`, `useStylistExperienceScore` |
| Enhancement (dedup) | 1 | `fetchAllBatched` consolidation across 7 files |

7 tasks, ~12 files changed, no database changes.

