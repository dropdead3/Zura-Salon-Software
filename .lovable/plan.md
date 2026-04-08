

# Bug & Gap Analysis — Batch Reports, Scheduled Reports, Run Now

## Critical Bugs

### Bug 1: Column name mismatches in `useBatchReportGenerator.ts` — queries return empty/null values

The `fetchReportData` function references columns that **do not exist** in the union views:

| Queried Column | Actual View Column | Affected Reports |
|---|---|---|
| `line_total` | `total_amount` | All sales, staff, financial, retail, discounts (13 reports) |
| `discount_amount` | `discount` | Discounts report |

Every `Number(r.line_total)` evaluates to `NaN` → `0`. **All revenue figures in batch-generated PDFs are $0.00.** This is a silent data corruption bug — no error is thrown, just wrong numbers.

**Fix:** Replace all `line_total` references with `total_amount`, and `discount_amount` with `discount` throughout `fetchReportData`.

### Bug 2: `gift_cards` and `vouchers` queries in batch generator are not org-scoped

Lines 260-261: `supabase.from(table).select('*').limit(500)` — no `organization_id` filter. With RLS this may be safe, but it violates the data architecture doctrine and could leak data if RLS has gaps.

**Fix:** Pass `orgId` into `fetchReportData` and add `.eq('organization_id', orgId)` to gift card/voucher queries.

### Bug 3: `ScheduleReportForm` staff query is not org-scoped

Lines 88-99: Fetches all active `employee_profiles` without filtering by `organization_id`. An org owner could see staff from other organizations in the recipient picker.

**Fix:** Import `useOrganizationContext`, filter by `organization_id`.

### Bug 4: `handleRunNow` does not call `completeRun` on failure

Lines 107-141 in `ScheduledReportsSubTab.tsx`: The catch block toasts an error but never calls `completeRun` with `success: false`. The run record stays stuck in `'running'` status permanently.

**Fix:** Add `completeRun.mutateAsync({ runId, reportId: report.id, success: false, errorMessage: err.message })` in the catch block. Requires capturing `runId` before the try/catch scope or restructuring.

### Bug 5: `handleRunNow` references `runId` but it's scoped inside try — failure path can't access it

The `runId` is obtained from `runNow.mutateAsync(report)` inside try. If `batchGenerator.generate()` fails, the catch needs `runId` but it's not accessible if the mutation itself succeeded but generation failed.

**Fix:** Hoist `runId` declaration outside try block, set it after the mutation succeeds.

## Gaps

### Gap 1: Merged PDF only has footer on last page

Line 371: `addReportFooter(mergedDoc, orgName)` is called once after the loop. For a 10-report pack, only the final page has a footer. Individual report PDFs in ZIP mode do have footers (via `generateSingleReportPdf`).

**Fix:** Call `addReportFooter` inside the loop after each report's autoTable, or accept this as a design choice (footer = document-level, not page-level).

### Gap 2: `v_all_clients` has `lead_source` column but batch generator queries `source`

Line 178: `.select('... source, birthday')`. The view has both `source` and `lead_source`. The `source` column identifies data origin (phorest vs zura), while `lead_source` is the marketing acquisition channel. The Client Source report uses `source` when it should likely use `lead_source` for meaningful results.

**Fix:** Use `lead_source` for the client-source report aggregation.

### Gap 3: `ScheduledReportsManager` duplicates `ScheduledReportsSubTab` functionality

Both components render the same scheduled reports list with nearly identical UI. `ScheduledReportsManager` lacks Run Now and uses a different pattern (dropdown menu vs inline buttons). This creates maintenance burden and inconsistent behavior.

**Note:** Not a bug, but worth consolidating in a future pass.

---

## Fix Plan

| File | Change |
|---|---|
| `useBatchReportGenerator.ts` | Replace `line_total` → `total_amount`, `discount_amount` → `discount`; add org-scoping to gift card/voucher queries; pass `orgId` param to `fetchReportData` |
| `ScheduleReportForm.tsx` | Add org-scoping to staff query via `useOrganizationContext` |
| `ScheduledReportsSubTab.tsx` | Fix `handleRunNow` to hoist `runId` and call `completeRun` on failure |
| `useBatchReportGenerator.ts` | Fix client-source to use `lead_source` instead of `source` |

4 file edits. No migrations. The column mismatch fix is the highest priority — it makes all batch PDFs show zero revenue.

