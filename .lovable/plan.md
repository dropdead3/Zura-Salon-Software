

# Fix: Restrict Future Date Selection for Historical Reports

## Problem
The ReportsHub global date picker allows selecting future dates for all reports. This is incorrect for historical/actuals-based reports (e.g. Daily Sales Summary, Tax Summary) since no sales data can exist in the future. However, some reports like "Future Appointments Value" explicitly need future dates.

The same issue exists in the AnalyticsHub date picker — no `disabled` constraint prevents future date selection.

## Report Classification

**Historical-only (must NOT allow future dates):**
All reports except the ones listed below. These include: `daily-sales`, `stylist-sales`, `location-sales`, `product-sales`, `retail-products`, `retail-staff`, `category-mix`, `tax-summary`, `discounts`, `staff-kpi`, `tip-analysis`, `staff-transaction-detail`, `compensation-ratio`, `client-attrition`, `top-clients`, `client-source`, `duplicate-clients`, `no-show-enhanced`, `deleted-appointments`, `demand-heatmap`, `executive-summary`, `payroll-summary`, `end-of-month`, `service-profitability`, `chemical-cost`, `location-benchmark`, `gift-cards`, `vouchers`.

**Future-aware (CAN allow future dates):**
- `future-appointments` — entire purpose is forward-looking
- `client-birthdays` — birthday lookups can span future months

## Approach

Rather than restricting the global date picker (which would break future-aware reports), the fix should:

1. **Cap the global calendar at today by default** — add `toDate={new Date()}` to the `<Calendar>` in `ReportsHub.tsx`, which disables all future days visually
2. **Also cap "This Month" preset** — when clicking "This Month", set `to` as `min(endOfMonth, today)` instead of always `endOfMonth` (which goes into the future)
3. **Override for future-aware reports** — when a user opens `future-appointments` or `client-birthdays`, the individual report components already handle their own date logic (e.g. `useFutureAppointmentsReport` uses `today` as the start and ignores `dateFrom`). No change needed for those.
4. **Same fix for AnalyticsHub** — cap the calendar picker at today and adjust "This Month" / "Today → End of Month" presets appropriately. Note: `todayToEom` is explicitly a future-looking preset used by Operations analytics, so that preset should remain but be scoped correctly.

## Fix Plan

| File | Change |
|---|---|
| `ReportsHub.tsx` | Add `toDate={new Date()}` to `<Calendar>` to disable future dates. Cap "This Month" preset `to` at `min(endOfMonth, today)`. Cap initial state `to` at today. |
| `AnalyticsHub.tsx` | Add `toDate={new Date()}` to the calendar picker. Adjust "This Month" preset to cap at today. Keep `todayToEom` preset functional (it's used for operations forecasting). |
| `FutureAppointmentsReport.tsx` | No change — already uses its own date logic starting from today. |
| `ClientBirthdaysReport.tsx` | No change — birthday lookups are date-agnostic (month/day matching). |

2 file edits. No migrations. The `toDate` prop on `react-day-picker` is the standard way to disable dates after a given date — it greys them out and prevents selection.

