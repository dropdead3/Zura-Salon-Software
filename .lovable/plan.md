

# Reports System — Gap & Bug Audit

## Bugs

### Bug 1: Category Mix revenue calculation includes tax
`useCategoryMixReport.ts` line 47: `const revenue = (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0)`. This **adds** tax to revenue, inflating the numbers. Revenue should exclude tax — it should be `total_amount` only (or `total_amount - tax_amount` if `total_amount` is gross-inclusive). Every other report in the system subtracts tips/tax from totals. This makes the Category Mix report show higher numbers than reality.

**Fix:** Change to `Number(row.total_amount) || 0` (drop the `+ tax_amount`).

### Bug 2: Client Attrition fetches ALL historical appointments (no date bounds)
`useClientAttritionReport.ts` has no `.gte('appointment_date', ...)` filter. It fetches **every appointment ever** to find each client's last visit. For a salon with years of history, this could be tens of thousands of rows fetched in batches. The `dateFrom` prop passed from the UI is ignored entirely (only `asOfDate` / `dateTo` is used for "days since" calculation).

**Fix:** Add a reasonable lower bound (e.g., 2 years back from `asOfDate`) to limit the query, or document this intentional behavior. The current approach works but is expensive.

### Bug 3: New reports missing `BlurredAmount` wrapper
Per UI Canon, all monetary values must use `BlurredAmount` for the hide-numbers toggle. The following new report components display raw currency without wrapping:
- `TipAnalysisReport.tsx` — all `formatCurrencyWhole()` calls
- `ServiceProfitabilityReport.tsx` — all `formatCurrencyWhole()` calls  
- `ChemicalCostReport.tsx` — all `formatCurrencyWhole()` calls
- `ServiceCategoryMixReport.tsx` — all `formatCurrencyWhole()` calls
- `TaxSummaryReport.tsx` — all `formatCurrencyWhole()` calls
- `ClientAttritionReport.tsx` — all `formatCurrencyWhole()` calls
- `StaffCompensationRatioReport.tsx` — KPI tiles and table cells
- `LocationBenchmarkReport.tsx` — table cells
- `DemandHeatmapReport.tsx` — N/A (no currency displayed) ✓

**Fix:** Wrap all `formatCurrencyWhole()` outputs in `<BlurredAmount>` in 8 report components.

### Bug 4: Inconsistent back-button pattern across new reports
Some new reports (TipAnalysis, ServiceProfitability, ChemicalCost, CategoryMix, TaxSummary, ClientAttrition) render their own "Back to Reports" ghost button **outside** the Card. But they're also listed in `selfContainedReports` (line 249), which means `ReportsTabContent` renders them without its own back button — so functionally it works. However, the pattern differs from `StaffCompensationRatioReport` and `LocationBenchmarkReport` which put the back button **inside** the Card header. This is cosmetic but inconsistent.

**Fix:** Standardize all new reports to use the inside-Card-header back button pattern (matching LocationBenchmark/StaffCompensation).

### Bug 5: CSV export doesn't escape commas in field values
All CSV downloads use `.join(',')` without escaping. Service names or stylist names containing commas will break CSV column alignment. E.g., "Smith, Jane" would split into two columns.

**Fix:** Add a CSV escape helper that wraps fields containing commas/quotes in double-quotes.

---

## Gaps

### Gap 1: `ReportsHub.tsx` date range doesn't reflect actual selection in `filters.dateRange`
Line 25: `dateRange: 'thisMonth'` is hardcoded regardless of what the user picks in the date picker. This key is passed to `IndividualStaffReport` as `dateRangeKey` and may affect comparison logic. If the user picks "Last Month", the key still says `thisMonth`.

**Fix:** Track which preset was selected (or use `'custom'`) and pass the correct key.

### Gap 2: No `ReportPreviewModal` integration on new reports
The existing `ReportPreviewModal` component provides a branded preview overlay before downloading. None of the 8 new reports use it — they all go straight to PDF/CSV download without preview. The older reports (Financial, Executive Summary) also skip it, so this is consistent but represents a missed UX opportunity.

**Status:** Low priority. Consistent with existing patterns.

---

## Implementation Priority

| # | Item | Risk | Effort |
|---|------|------|--------|
| 1 | Bug 3: Add `BlurredAmount` to 8 reports | **High** (privacy violation) | Medium (8 files) |
| 2 | Bug 1: Fix category mix revenue calc | **Medium** (data accuracy) | Trivial |
| 3 | Bug 5: CSV comma escaping | **Medium** (data corruption) | Small (shared helper) |
| 4 | Bug 4: Standardize back-button pattern | Low | Small (6 files) |
| 5 | Gap 1: Fix hardcoded dateRange key | Low | Trivial |
| 6 | Bug 2: Add date bounds to attrition query | Low (perf only) | Small |

## Files Changed

| File | Changes |
|---|---|
| 8 report components in `src/components/dashboard/reports/` | Add `BlurredAmount` wrapping |
| `src/hooks/useCategoryMixReport.ts` | Remove `+ tax_amount` from revenue calc |
| `src/utils/csvExport.ts` (new) | Shared CSV escape helper |
| 8 report components | Use CSV escape helper in `downloadCSV` |
| 6 report components | Move back button inside Card header |
| `src/pages/dashboard/admin/ReportsHub.tsx` | Track date range preset key |
| `src/hooks/useClientAttritionReport.ts` | Add 2-year lower bound on query |

~15 file touches, no database migrations.

