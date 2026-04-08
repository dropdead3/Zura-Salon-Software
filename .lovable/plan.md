

# Gap Analysis, Bug Fixes & "Run Now" Feature

## Bugs Found

### Bug 1: `useScheduledReports` query is not org-scoped
The `useScheduledReports` hook fetches all `scheduled_reports` without filtering by `organization_id`. RLS may protect against cross-org leaks, but the query lacks the standard org-scoping pattern (`enabled: !!orgId`, org filter in query, org in cache key). This violates the data architecture doctrine.

**Fix:** Import `useOrganizationContext`, filter by `organization_id`, add org to query key, and gate with `enabled: !!orgId`.

### Bug 2: `useScheduledReportRuns` fires even when no reportId
Line 78: `enabled: true` — this means the query runs even when `reportId` is undefined, fetching unfiltered runs. Should be `enabled: !!reportId`.

### Bug 3: `ScheduledReportsSubTab` has no Edit button on report cards
The `ScheduledReportsSubTab` renders a card for each scheduled report but provides no way to edit it. Only History, Pause/Resume, and Delete are available. The `editingReport` state exists but is never set to a non-null value. Users must delete and recreate to change anything.

**Fix:** Add an Edit icon button to the card action buttons that sets `editingReport` and opens the form.

### Bug 4: Duplicate report catalogs — `BatchReportDialog` and `ScheduleReportForm` maintain separate hardcoded lists
`BatchReportDialog` has 29 reports (ALL_REPORTS), `ScheduleReportForm` has 21 reports (REPORT_OPTIONS). They're out of sync — Schedule is missing: `location-sales`, `product-sales`, `staff-transaction-detail`, `client-source`, `duplicate-clients`, `future-appointments`, `chemical-cost`, `location-benchmark`, `service-profitability`. This means users can batch-download reports they can't schedule.

**Fix:** Extract a shared `REPORT_CATALOG` constant to a common file and import it in both components.

### Bug 5: Merged PDF re-fetches all data
In `useBatchReportGenerator`, the merged PDF path (line 345-375) calls `fetchReportData` a second time for every report after already generating individual PDFs. This doubles the query load. The individual buffers are already generated but aren't used for merging (because jsPDF can't merge ArrayBuffers).

**Fix:** For merged output, skip the individual PDF generation loop entirely and go straight to the merged doc generation. Only generate individual PDFs when output is ZIP.

### Bug 6: `calculateNextRunTime` weekly logic is incorrect
When `schedule_type === 'weekly'`, line 257 first adds 7 days, then recalculates based on `dayOfWeek`. The `daysUntil` calculation uses `next.getDay()` (which is already 7 days ahead) but then adds `daysUntil` to `now.getDate()`. This can produce incorrect dates — the next run could be 2 weeks away instead of 1.

**Fix:** Calculate `daysUntil` from `now` directly without the initial `+7`.

---

## "Run Now" Feature

### What it does
Adds a "Run Now" button to each scheduled report card. When clicked, it triggers an immediate client-side generation of the selected reports (using the same `useBatchReportGenerator` logic) and downloads the result. A run record is inserted into `scheduled_report_runs` to maintain the audit trail. This is a local generation — no email delivery — since email delivery infrastructure (the cron-based dispatcher) is Phase 2.

### Implementation

**Hook changes — `useScheduledReports.ts`:**
- Add `useRunScheduledReportNow` mutation that:
  1. Inserts a `scheduled_report_runs` row with `status: 'running'`
  2. Returns the report config (report_ids from filters, format) for the caller to generate
  3. On completion, updates the row to `status: 'completed'` and updates `last_run_at` on the parent schedule

**UI changes — `ScheduledReportsSubTab.tsx`:**
- Add a "Run Now" (`Play` or `Zap`) icon button next to History/Pause/Delete
- On click, extract the report config from the schedule's `filters.report_ids`, invoke the batch generator with the current date range, and download the result
- Show a loading spinner on the button while generating

---

## Fix Plan

| File | Change |
|---|---|
| New: `src/config/reportCatalog.ts` (extend) or `src/config/reportOptions.ts` | Shared `REPORT_CATALOG` constant with all 29 reports |
| `src/hooks/useScheduledReports.ts` | Org-scope query, fix `enabled`, fix weekly calc, add `useRunScheduledReportNow` |
| `src/components/dashboard/reports/scheduled/ScheduledReportsSubTab.tsx` | Add Edit + Run Now buttons |
| `src/components/dashboard/reports/batch/BatchReportDialog.tsx` | Import shared catalog |
| `src/components/dashboard/reports/scheduled/ScheduleReportForm.tsx` | Import shared catalog |
| `src/components/dashboard/reports/batch/useBatchReportGenerator.ts` | Skip double-fetch for merged output |

6 bugs fixed + 1 new feature. No migrations needed.

