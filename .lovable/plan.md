

# Bug & Gap Analysis — Pass 8

## Bugs

### Bug 1 (Medium): `location-benchmark` queries `phorest_appointments` directly, bypassing dual-source pattern
Line 346: The `location-benchmark` handler queries `phorest_appointments` instead of `v_all_appointments`. This violates the POS-First data integrity model (Zura Primary → Phorest Fallback) and will miss any Zura-native appointments entirely. Every other appointment-based batch report uses `v_all_appointments`.

**Fix:** Switch from `phorest_appointments` to `v_all_appointments`. Adjust column references accordingly (`total_price` stays the same, `phorest_client_id` → `phorest_client_id` which exists on both).

### Bug 2 (Medium): `chemical-cost` is identical to `service-profitability` — no differentiation
Lines 440-464 vs 414-438: Both handlers query `v_all_transaction_items` filtered to `item_type = 'service'`, group by `item_name`, and show revenue + quantity. The only difference is `chemical-cost` appends a static "Cost data requires backroom integration" note in every row. The interactive `ChemicalCostReport` component accesses chemical cost data from a different source. The batch version adds no value beyond what `service-profitability` already provides.

**Fix:** Differentiate by querying `unit_price` (available on the view) to show cost-per-unit alongside revenue, or at minimum add a summary note row at the top instead of repeating the limitation message on every row.

### Bug 3 (Low): `staff-kpi` and `staff-transaction-detail` fall through to generic `[Stylist, Revenue]` handler
Lines 145-164: `staff-kpi` and `staff-transaction-detail` share a case block. `tip-analysis` gets its own handler (lines 157-161), but `staff-kpi` and `staff-transaction-detail` both fall to the generic two-column output. `staff-kpi` should show multiple KPIs (revenue, tips, transaction count, avg ticket). `staff-transaction-detail` should show individual transaction lines, not aggregated staff totals.

**Fix:** Add dedicated sub-handlers for `staff-kpi` (include revenue, tips, count, avg ticket per staff) and `staff-transaction-detail` (show individual lines: date, item, type, amount per staff).

### Bug 4 (Low): `client-attrition` batch includes clients with `last_visit = null` as "999 days"
Line 255-256: Clients with no `last_visit` are included with `days = 999` and tier "Lost". These could be newly created clients who haven't had their first visit yet, not actually lost clients. The interactive `useClientAttritionReport` filters by appointment history over a 2-year window, which naturally excludes never-visited clients.

**Fix:** Filter out clients where `last_visit` is null, or add a separate tier label "Never Visited" to distinguish them from genuinely lost clients.

### Bug 5 (Low): `BatchReportDialog` clears selection on generate but doesn't wait for completion
Line 97-98: `setSelectedIds(new Set())` runs immediately after `generate()` resolves, then `setTimeout(() => onOpenChange(false), 600)` closes the dialog. But if generation takes longer than 600ms (it always does for multiple reports), the dialog closes while the user sees the progress bar. The progress bar state lives in `useBatchReportGenerator` which continues running, but the dialog is gone. Not a data bug, but UX is confusing — the dialog disappears mid-generation.

**Fix:** Move `onOpenChange(false)` into the `generate` callback's finally block, or await the full generation before closing. The current code already awaits `generate`, so the issue is the `setTimeout` — it should close immediately after await completes, not on a timer.

## Gaps

### Gap 1: Several interactive reports in `ReportsTabContent` have no batch handler
Reports listed in the interactive UI but hitting the `default` case in `fetchReportData`: `individual-staff`, `productivity`, `rebooking`, `new-clients`, `retention`, `lifetime-value`, `new-vs-returning`, `visit-frequency`, `capacity`, `no-show`, `service-duration`, `lead-time`, `revenue-trend`, `commission`, `goals`, `yoy`. These all return "Report data not available for batch generation." when included in a Report Pack.

These are not in `REPORT_CATALOG` so they can't be selected in `BatchReportDialog` or `ScheduleReportForm` — so this is informational, not a blocking gap. The catalog correctly limits batch-eligible reports.

### Gap 2: No "Select All" / category toggle in `ScheduleReportForm`
`BatchReportDialog` has `toggleCategory` for bulk report selection. `ScheduleReportForm` lacks this — each report must be individually checked. Minor UX inconsistency.

---

## Fix Plan

| File | Change |
|---|---|
| `useBatchReportGenerator.ts` | Switch `location-benchmark` from `phorest_appointments` to `v_all_appointments` |
| `useBatchReportGenerator.ts` | Differentiate `chemical-cost` — add `unit_price` column, move limitation note to a summary row |
| `useBatchReportGenerator.ts` | Split `staff-kpi` handler (revenue, tips, count, avg ticket per staff) and `staff-transaction-detail` (individual line items) |
| `useBatchReportGenerator.ts` | Filter out `last_visit = null` clients from `client-attrition` or label them "Never Visited" |
| `BatchReportDialog.tsx` | Remove `setTimeout` for dialog close — close immediately after `generate()` resolves |

2 file edits. No migrations. Bug 1 is the most impactful — it silently excludes Zura-native appointment data from location benchmarking.

