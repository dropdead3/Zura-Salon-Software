

# Bug & Gap Analysis — Pass 9

## Bugs

### Bug 1 (High): `useDailySalesSummary` queries `phorest_transaction_items` directly, bypassing dual-source pattern
Line 118 in `useSalesData.ts`: The hook queries `phorest_transaction_items` instead of `v_all_transaction_items`. This violates the POS-First data integrity model and will miss all Zura-native transactions. The batch generator (`useBatchReportGenerator.ts` line 98) correctly uses `v_all_transaction_items` for the same `daily-sales` report. This means the interactive Daily Sales Summary and the batch version show different data.

**Fix:** Change `useDailySalesSummary` to query `v_all_transaction_items` and use `fetchAllBatched`. Adjust column references (`total_amount` stays, `tax_amount` stays, `stylist_user_id` → `staff_user_id` per view normalization).

### Bug 2 (Medium): `useLocationBenchmark` queries `phorest_appointments` directly
Line 33 in `useLocationBenchmark.ts`: The interactive Location Benchmarking report queries `phorest_appointments` instead of `v_all_appointments`. The batch version was fixed in Pass 8, but the interactive hook was not. Same dual-source violation — misses Zura-native appointments.

**Fix:** Switch to `v_all_appointments` in `useLocationBenchmark.ts`.

### Bug 3 (Medium): Daily Sales Summary monetary values not wrapped in `BlurredAmount`
Lines 339-353 and 378-383 in `SalesReportGenerator.tsx`: All currency values in the KPI tiles and daily table are rendered as raw text. Every other report component wraps monetary values in `<BlurredAmount>` for the hide-numbers privacy toggle. This report leaks real revenue when the toggle is active.

**Fix:** Import `BlurredAmount` and wrap all `formatCurrencyWhole(...)` calls in the daily sales UI.

### Bug 4 (Low): Daily Sales Summary table headers missing `tokens.table.columnHeader`
Lines 363-370: `<TableHead>` elements use no className or `className="text-right"` instead of the required `tokens.table.columnHeader`. Per UI Canon, all table column headers must use this token (Aeonik Pro, Title Case, never uppercase).

**Fix:** Add `className={tokens.table.columnHeader}` (and `cn(tokens.table.columnHeader, 'text-right')` for numeric columns) to all `<TableHead>` elements in the daily sales table and preview modal duplicate.

### Bug 5 (Low): Batch `daily-sales` only shows `[Date, Revenue]` — no breakdown
Line 106-109 in `useBatchReportGenerator.ts`: The batch handler for `daily-sales` aggregates to just two columns `[Date, Revenue]`. The interactive version now shows 7 columns (Date, Total Revenue, Service Rev, Product Rev, Services, Products, Avg Ticket). Users expect the batch PDF to match.

**Fix:** Expand the batch `daily-sales` handler to group by date with service/product split, matching the interactive table structure.

### Bug 6 (Low): `useDailySalesSummary` revenue formula uses `total_amount + tax_amount`
Line 152: Revenue is calculated as `total_amount + tax_amount`. Per the data integrity standards, Gross Revenue = `total_amount + tax_amount` is correct for historical actuals. However, the `SalesReportGenerator` KPI tiles use `useSalesMetrics` which may use a different formula, creating potential discrepancy between the KPI totals and the sum of the daily breakdown rows.

**Impact:** Informational — verify formulas align. No fix needed if both use the same Gross Revenue formula.

## Gaps

### Gap 1: `useSalesByStylist` and `useSalesByLocation` not checked for dual-source compliance
These hooks (used by the interactive `stylist-sales` and `location-sales` reports) may also query Phorest tables directly. Should be verified and migrated if needed.

---

## Fix Plan

| File | Change |
|---|---|
| `useSalesData.ts` | Switch `useDailySalesSummary` from `phorest_transaction_items` to `v_all_transaction_items`; use `fetchAllBatched` |
| `useLocationBenchmark.ts` | Switch from `phorest_appointments` to `v_all_appointments` |
| `SalesReportGenerator.tsx` | Wrap all monetary values in `<BlurredAmount>`; add `tokens.table.columnHeader` to all `<TableHead>` elements in daily table + preview modal |
| `useBatchReportGenerator.ts` | Expand batch `daily-sales` handler to show 7-column breakdown matching interactive version |

4 file edits. No migrations. Bug 1 is the most impactful — it causes the interactive daily sales report to silently exclude all Zura-native data.

