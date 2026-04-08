

# Bug & Gap Analysis — Pass 7

## Bugs

### Bug 1 (Medium): `ScheduleReportForm` — `locations.map` crashes when `locations` is undefined
Line 275: `{locations.map(loc => ...)}` — the guard on line 266 uses `(locations?.length ?? 0) > 1`, which correctly prevents rendering the outer block when `locations` is undefined. However, if `locations` starts as `undefined` and then loads with length > 1, the render on line 275 accesses `locations.map` without optional chaining. Since the guard already passed, `locations` should be defined at that point — but there's a race where React may render with stale state. Safer to use `locations?.map`.

**Fix:** Change `locations.map` to `locations?.map` on line 275.

### Bug 2 (Medium): `tax-summary` batch report has no tax data
Lines 335-366: `tax-summary` falls through to the generic handler that groups by `item_type` and shows `[Category, Revenue]`. The `v_all_transaction_items` view **does** have a `tax_amount` column (confirmed in schema), but the select on line 341 doesn't include it. The interactive `useTaxSummary` hook queries `phorest_transaction_items` directly and computes tax breakdowns. The batch version shows zero tax information.

**Fix:** Add a dedicated `tax-summary` case that selects `tax_amount` alongside `total_amount, item_type, location_id, branch_name, transaction_date` and produces a summary table with Total Tax, Pre-Tax Revenue, Gross Revenue, and a by-item-type breakdown showing tax per category.

### Bug 3 (Low): `service-profitability` and `chemical-cost` batch reports are generic category summaries
Both fall through to the generic `[Category, Revenue]` handler. Neither provides profitability margins or chemical cost breakdowns. Users downloading these expect actionable financial data, not a two-column summary.

**Fix:** `service-profitability` — group services by name, show revenue, avg price, and quantity. `chemical-cost` — filter to services, show revenue and quantity (cost data isn't in the view, so note limitation in output).

### Bug 4 (Low): `compensation-ratio` batch report is just a staff revenue list
Lines 119-139: `compensation-ratio` falls through to the generic staff handler showing `[Stylist, Revenue]`. No compensation or ratio data is included. The report name implies payroll-to-revenue ratio analysis.

**Fix:** Add a dedicated handler that shows revenue per staff member and includes tip amounts. Note in output that actual compensation data requires payroll integration.

### Bug 5 (Low): `deleted-appointments` query has no date filter
Lines 277-278: When `reportId === 'deleted-appointments'`, the query filters only by `deleted_at IS NOT NULL` but doesn't apply date range filters. This fetches ALL deleted appointments ever, ignoring `dateFrom`/`dateTo`. Could return thousands of rows spanning years.

**Fix:** Add `.gte('appointment_date', dateFrom).lte('appointment_date', dateTo)` for the deleted-appointments case.

### Bug 6 (Low): `client-attrition` batch report is just a generic client list
Line 238: Falls through to the generic `[Client, Email, Spend, Visits]` handler. No attrition analysis — no filtering by last visit date, no "days since last visit", no at-risk classification. The interactive `useClientRetentionReport` does real retention cohort analysis.

**Fix:** Add a dedicated handler that filters clients whose `last_visit` is older than 90 days, sorts by last visit ascending, and includes a "Days Since Visit" column.

## Gaps

### Gap 1: `tax-summary`, `service-profitability`, `chemical-cost`, `compensation-ratio`, `client-attrition` still use generic handlers
These 5 reports produce misleading output. Combined with the 4 already fixed in Pass 6, this was originally an 8-report gap. 4 remain.

### Gap 2: No batch report for `location-sales`
The `location-sales` report ID in the catalog falls through to the generic transaction handler which shows `[Date, Item, Type, Qty, Total]` — no location grouping. For multi-location orgs this is a key report.

---

## Fix Plan

| File | Change |
|---|---|
| `ScheduleReportForm.tsx` | `locations.map` → `locations?.map` on line 275 |
| `useBatchReportGenerator.ts` | Add dedicated `tax-summary` handler using `tax_amount` from `v_all_transaction_items` |
| `useBatchReportGenerator.ts` | Add dedicated `service-profitability` handler (group services by name, show revenue/qty/avg) |
| `useBatchReportGenerator.ts` | Add dedicated `compensation-ratio` handler (staff revenue + tips) |
| `useBatchReportGenerator.ts` | Add dedicated `client-attrition` handler (filter by last_visit > 90 days, add "Days Since" column) |
| `useBatchReportGenerator.ts` | Fix `deleted-appointments` to apply date range filter |
| `useBatchReportGenerator.ts` | Add dedicated `location-sales` handler (group transactions by location) |

2 file edits. No migrations. Bug 2 (tax-summary showing no tax data) is the most user-visible issue.

