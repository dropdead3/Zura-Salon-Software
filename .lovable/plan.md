

# Bug & Gap Analysis — Pass 4

## Bugs

### Bug 1 (Critical): `v_all_clients` has no `organization_id` column — query silently fails
Line 182 of `useBatchReportGenerator.ts` calls `.eq('organization_id', orgId)` on `v_all_clients`, but the view does not expose `organization_id`. Confirmed via schema inspection: the view has 21 columns and `organization_id` is not one of them. This will cause the Supabase query to error or return zero rows, making all client-related batch reports (client-attrition, top-clients, client-source, client-birthdays, duplicate-clients) return empty data.

**Fix:** Remove `.eq('organization_id', orgId)` from the `v_all_clients` query. RLS via `security_invoker` already scopes data. Alternatively, add `organization_id` to the view in a migration — but that's a larger change. For now, remove the broken filter and rely on RLS.

### Bug 2: `ScheduleReportForm` `groupedReports` has stale memo — empty dependency array
Line 169-178: `useMemo(() => { ... }, [])` — the dependency array is empty but the computation depends on `tier`. If the user's location count changes (or on first render when `locations` loads asynchronously), the filtered reports won't update. The memo will use the initial tier value forever.

**Fix:** Add `tier` to the dependency array: `useMemo(() => { ... }, [tier])`.

### Bug 3: `vouchers` table has no `created_at` column
Line 271: The voucher query `select('*')` then maps `v.valid_from` (correct per Pass 3 fix). However, `gift_cards` line 269 maps `g.created_at` — let me verify. Gift cards DO have `created_at` (confirmed). Vouchers do NOT have `created_at` but `valid_from` is correctly used. This is already fixed. No action needed.

### Bug 4: `handleRunNow` doesn't disable button for paused reports
Users can click "Run Now" on a paused (`is_active: false`) schedule. While not technically broken, it's confusing — the schedule is paused but can still be manually triggered. Minor UX issue.

**Fix:** Either disable Run Now for paused reports, or document this as intentional (manual override).

### Bug 5: `ScheduleReportForm` edit mode doesn't reset form when closing and reopening for "New"
Lines 110-130: The `useEffect` resets form when `editReport` changes or `open` changes. But if user edits Report A, closes the panel, then clicks "New Schedule", `editReport` is set to `null` and `open` to `true` — this should trigger the reset via the else branch. This appears correct. No action needed.

### Bug 6: Merged PDF footer only appears on the last page
Line 376: `addReportFooter(mergedDoc, orgName)` is called once after all reports are rendered. For a multi-report merged PDF, only the final page gets the footer. Individual reports in ZIP mode each get their own footer.

**Fix:** Move `addReportFooter` inside the report loop, after each report's autoTable completes. This gives each report section its own footer.

## Gaps

### Gap 1: `v_all_appointments` and `v_all_transaction_items` have no `organization_id` column
Neither view exposes `organization_id`. Batch reports for appointments (no-show, deleted, demand-heatmap, future-appointments) have no org filter when `locationId` is absent ("All Locations"). Data is scoped only by RLS. This is defense-in-depth concern — if RLS has any gap, cross-org data could leak.

**Note:** This requires a migration to add `organization_id` to both views. Recommended for a hardening pass but not blocking.

### Gap 2: No "Select All" / "Deselect All" in ScheduleReportForm
`BatchReportDialog` has category-level toggle (select/deselect all in a category). `ScheduleReportForm` lacks this — each report must be toggled individually, which is tedious for 30 reports.

**Note:** Minor UX gap, not a bug.

---

## Fix Plan

| File | Change |
|---|---|
| `useBatchReportGenerator.ts` | Remove `.eq('organization_id', orgId)` from `v_all_clients` query (column doesn't exist in view) |
| `ScheduleReportForm.tsx` | Fix `groupedReports` memo dependency array: `[]` → `[tier]` |
| `useBatchReportGenerator.ts` | Move `addReportFooter` inside the merged PDF loop so each report section gets a footer |

3 edits. No migrations. Bug 1 is critical — it silently breaks all client batch reports.

