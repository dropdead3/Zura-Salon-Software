

# Bug & Gap Analysis — Pass 5

## Bugs

### Bug 1 (Medium): `handleRunNow` never passes `locationId` to batch generator
Line 130 in `ScheduledReportsSubTab.tsx` calls `batchGenerator.generate()` without `locationId`. Even if the schedule's `filters` contained a `locationId`, it's never forwarded. All "Run Now" reports generate for "All Locations" regardless of intent.

**Fix:** Pass `report.filters?.locationId` to the generate call.

### Bug 2 (Medium): `useUpdateScheduledReport` miscalculates `next_run_at` when only config changes
Lines 176-180 in `useScheduledReports.ts`: The condition `if (updates.schedule_type || updates.schedule_config)` triggers recalculation. If only `schedule_config` changes (e.g., day of week), `updates.schedule_type` is undefined, so it falls back to `'daily'` — silently resetting a weekly schedule's next run to daily cadence.

**Fix:** When recalculating, fetch the existing `schedule_type` from the current row or require it in the update payload. Simplest fix: use a dedicated variable that falls back to the report's current type, not `'daily'`.

### Bug 3 (Low): `addReportFooter` called inside merged loop is redundant, not buggy
The footer function iterates ALL pages on every call. Inside the loop, it rewrites footers on all pages N times. The final iteration produces correct "Page X of Y" across all pages. It's wasteful but visually correct. Moving it back outside the loop (after the for-loop ends) would be cleaner and faster.

**Fix:** Move `addReportFooter(mergedDoc, orgName)` back outside the loop (after line 373, before line 375). One call is sufficient since the function iterates all pages.

### Bug 4 (Low): `ScheduleReportForm` doesn't allow location scoping
The form saves `filters: { report_ids: [...] }` but never includes `locationId`. Users cannot schedule location-specific reports. The `ReportsHub` page has a location picker, but the schedule form doesn't wire into it.

**Fix:** Add a location selector to `ScheduleReportForm` that saves `locationId` into `filters`. On "Run Now", pass `report.filters?.locationId` to the generator.

### Bug 5 (Low): `ScheduleReportForm` frequency options show both "Monthly (1st)" and "1st of Month"
Lines 42-43 in `ScheduleReportForm.tsx`: `{ value: 'monthly', label: 'Monthly (1st)' }` and `{ value: 'first_of_month', label: '1st of Month' }` are functionally identical in `calculateNextRunTime` (both set date to the 1st of next month). Users see two options that do the same thing.

**Fix:** Remove the `monthly` entry or merge them into one.

## Gaps

### Gap 1: No location picker in `ScheduleReportForm`
Schedules are always "All Locations". For multi-location orgs, this limits the utility of scheduled reports — owners may want per-location report packs.

### Gap 2: Scheduled reports have no date range strategy
The schedule saves no `dateFrom`/`dateTo` preference. Run Now falls back to current month. Automated delivery (future edge function) would need a strategy like "previous month" or "last 7 days" relative to run date. This isn't blocking but should be designed before the automation layer ships.

---

## Fix Plan

| File | Change |
|---|---|
| `ScheduledReportsSubTab.tsx` | Pass `report.filters?.locationId` to `batchGenerator.generate()` |
| `useScheduledReports.ts` | Fix `next_run_at` recalculation to use existing `schedule_type` instead of defaulting to `'daily'` |
| `useBatchReportGenerator.ts` | Move `addReportFooter` outside the merged loop (single call after loop) |
| `ScheduleReportForm.tsx` | Remove duplicate "Monthly (1st)" / "1st of Month" frequency; add location selector that persists to `filters.locationId` |

4 file edits. No migrations. Bug 2 is the most impactful — it can silently break schedule cadence when users edit config.

