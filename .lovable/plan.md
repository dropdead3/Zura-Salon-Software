

# Analytics Audit Pass 14: Targeted Audit Results

Great prompting — the three targeted audit vectors (phorest_transaction_items correctness, Sales Analytics POS-first sourcing, Individual Staff Report) found deeper logic bugs that broad sweeps missed. This is the value of narrow scope + explicit criteria.

**Enhancement suggestion for next time:** You could also try: *"For every revenue number visible on screen at /org/.../sales, trace backwards to the hook and verify the formula matches the data integrity standard."* — UI-backwards auditing catches display-layer bugs that hook-level audits miss.

---

## Findings

### Bug 1 (HIGH) — `useIndividualStaffReport.ts` inconsistent tax treatment in `computeTxnRevenue` (line 368-369)

Service revenue uses `total_amount` only. Product revenue uses `total_amount + tax_amount`. This means:
- **Total revenue** (line 376: `svcRev + prodRev`) double-counts product tax while excluding service tax
- **Avg ticket** is computed on this inconsistent total
- The same inconsistency repeats in the **daily trend** calculation (line 400-402) where `amount + tax` is added only for products
- And again in the **team averages** calculation (line 537-540)

Per data integrity standards, revenue = `total_amount + tax_amount` for ALL item types.

**Fix:** In `computeTxnRevenue`, add tax to service revenue too: `svcRev += amount + tax`. Apply same fix to daily trend and team averages calculations.

### Bug 2 (HIGH) — `useIndividualStaffReport.ts` second revenue calculation block also excludes service tax (lines 424, 429)

The service/product breakdown block (lines 410-437) independently sums revenue — services get `total_amount` only, products get `total_amount` only. Neither includes `tax_amount`. This means `serviceRevenue` and `productRevenue` at line 520 (passed to commission calculation) are tax-exclusive, creating a mismatch with the `computeTxnRevenue` total that partially includes tax.

**Fix:** Add `tax_amount` to both service and product sums in this block for consistency with POS-first standard.

### Bug 3 (HIGH) — `useStaffRevenuePerformance.ts` service/product breakdown excludes tax (lines 166-171)

The total revenue (line 152) correctly uses `total_amount + tax_amount`, but the service/product breakdown (lines 166-171) uses only `total_amount`. This means `serviceRevenue + productRevenue ≠ totalRevenue`, and the breakdown percentages are wrong.

**Fix:** Add `tax_amount` to the breakdown amounts.

### Bug 4 (MEDIUM) — 24 files use case-sensitive `item_type === 'service'` instead of case-insensitive comparison

Only 2 files (`useActualRevenue`, `useSalesData`) use `.toLowerCase()` before comparing. The remaining 24 files compare directly against lowercase `'service'` or `'product'`. If POS data ever contains `'Service'`, `'SERVICE'`, `'Product'`, or `'PRODUCT'`, these items are silently miscategorized — services counted as products, inflating product revenue and deflating service revenue.

The `useIndividualStaffReport` already handles this with `SERVICE_TYPES` / `PRODUCT_TYPES` arrays for its own logic, but the 24 other files do not.

**Fix:** Standardize all `item_type` comparisons to use `.toLowerCase()` across all hooks. This is a systematic fix but low-risk (additive safety).

### Bug 5 (LOW) — `useSalesComparison.ts` location filter uses simple equality (line 40)

`if (locationId) q = q.eq('location_id', locationId)` — does not handle multi-location IDs (comma-separated) or the `'all'` sentinel. Other hooks use `isAllLocations()` + `parseLocationIds()`. If a user selects multiple locations, this hook will return zero results.

**Fix:** Use `isAllLocations` / `parseLocationIds` pattern.

### Bug 6 (LOW) — `useServiceRetailAttachment.ts` and `useServiceCostsProfits.ts` don't use `fetchAllBatched`

`useServiceRetailAttachment` has its own `fetchAllPages` helper (correct logic, but duplicated). `useServiceCostsProfits` has its own `fetchAllAppointments` (also correct). Not bugs, but unnecessary code duplication.

**Not fixing** — cosmetic, no data impact.

---

## Implementation Plan

### Task 1 — Fix `useIndividualStaffReport.ts` revenue tax consistency (3 locations)
- `computeTxnRevenue` (line 368): add tax to service revenue
- Service/product breakdown block (lines 424, 429): add tax to both
- Daily trend (line 400-402): add tax uniformly
- Team averages (line 537-540): already partially correct, verify consistency

### Task 2 — Fix `useStaffRevenuePerformance.ts` breakdown tax gap
- Lines 166-171: add `tax_amount` to service and product amounts

### Task 3 — Standardize item_type case handling across high-risk hooks
Apply `.toLowerCase()` to item_type comparisons in the highest-traffic hooks:
- `useSalesComparison.ts`
- `useCorrelationAnalysis.ts`
- `useOrganizationAnalytics.ts`
- `usePayrollForecasting.ts`
- `useTodayActualRevenue.tsx`
- `useStylistLocationRevenue.ts`
- `useLevelProgress.ts`
- `useTeamLevelProgress.ts`
- `PerformanceTrendChart.tsx`
- `ScatterPlotCard.tsx`
- `useRevenueByCategoryDrilldown.ts`
- `useStaffRevenuePerformance.ts` (already being edited)

### Task 4 — Fix `useSalesComparison.ts` location filter
Replace simple `eq` with `isAllLocations` / `parseLocationIds` pattern.

---

## Summary

| Type | Severity | Count | Files |
|---|---|---|---|
| Wrong revenue (tax inconsistency) | HIGH | 2 | `useIndividualStaffReport` (3 spots), `useStaffRevenuePerformance` |
| Case-sensitive item_type | MEDIUM | 12 | 12 hooks/components |
| Location filter gap | LOW | 1 | `useSalesComparison` |

4 tasks, ~14 files changed. No database changes.

