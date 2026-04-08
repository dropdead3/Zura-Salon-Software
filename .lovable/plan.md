

# Gap and Bug Pass — Batch 1-4 Reports

## Findings

### Bugs

1. **Staff Strikes hook missing org scope** — `useStaffStrikesReport` queries `staff_strikes` without filtering by organization. The table lacks an `organization_id` column, so strikes from all orgs could leak. Fix: join through `employee_profiles` to scope to org members only.

2. **Staff Milestones ignores date range** — The component receives `dateFrom`/`dateTo` props but the hook uses a hardcoded `daysAhead: 30`. Should either use the date range to compute `daysAhead` or expose a filter control in the UI.

3. **Permissions Audit ignores date range** — Receives `dateFrom`/`dateTo` props but doesn't use them (permissions are point-in-time). Minor, but the PDF header shows the date range which is misleading. Should display "As of [today]" instead.

4. **PTO Balances ignores date range** — Same issue as Permissions Audit. Point-in-time data, but the PDF header may show a misleading date range.

5. **Churn Risk ignores date range** — Hook pulls all scores without date filtering. Should either filter by `analyzed_at` or show "Current" in PDF header.

6. **Booth Renter ignores date range** — Same pattern. Point-in-time snapshot. PDF header should say "Current" not a date range.

7. **Training Completion ignores date range** — Point-in-time. Same fix needed.

8. **`future-appointments` is listed in `financialReports` array** (line 168) but cataloged under `operations` in `REPORT_CATALOG`. Misplaced — it renders under the Financial tab in the UI but belongs in Operations.

9. **Console error: RecentReports ref warning** — `RecentReports` is a function component receiving a ref from somewhere. Non-breaking but noisy.

### Gaps

10. **Staff Strikes not scoped by `locationId`** — The hook accepts no location filter; should filter via employee_profiles join.

11. **Several "point-in-time" reports accept dateFrom/dateTo but don't use them** — Creates false expectation. These reports should either not show the date picker context or clearly label their PDF as "Current Snapshot".

## Plan

### Fix 1: Staff Strikes org + location scoping
- In `useStaffStrikesReport.ts`, fetch `employee_profiles` for the org, build a user ID set, then filter strikes to only those users. Also accept `locationId` and filter profiles by it.

### Fix 2: Move `future-appointments` from `financialReports` to `operationsReports`
- In `ReportsTabContent.tsx`, move the entry from `financialReports` array to `operationsReports` array.

### Fix 3: Point-in-time reports — correct PDF date headers
- For Permissions Audit, PTO Balances, Churn Risk, Booth Renter, Training Completion, and Staff Milestones:
  - Update `generatePDF` to show `dateFrom: 'Current'` / `dateTo: 'Snapshot'` or `dateFrom: format(new Date(), 'yyyy-MM-dd')` with `dateTo: 'Current'` so the header is not misleading.
  - No hook changes needed for these — they're correctly point-in-time.

### Fix 4: Staff Milestones — derive daysAhead from date range
- Calculate `daysAhead` from `differenceInDays(dateTo, dateFrom)` in the component, pass to hook. Fallback to 30 if range is invalid.

### Fix 5: Console warning — RecentReports
- Wrap `RecentReports` with `React.forwardRef` or ensure it's not receiving a ref.

### Files Modified

| File | Change |
|---|---|
| `useStaffStrikesReport.ts` | Add org-scoping via employee_profiles join; add locationId filter |
| `ReportsTabContent.tsx` | Move `future-appointments` from financialReports to operationsReports |
| `StaffMilestonesReport.tsx` | Derive `daysAhead` from date range |
| `PermissionsAuditReport.tsx` | Fix PDF header to "Current Snapshot" |
| `PTOBalancesReport.tsx` | Fix PDF header to "Current Snapshot" |
| `ChurnRiskReport.tsx` | Fix PDF header to "Current Snapshot" |
| `BoothRenterReport.tsx` | Fix PDF header to "Current Snapshot" |
| `TrainingCompletionReport.tsx` | Fix PDF header to "Current Snapshot" |
| `RecentReports.tsx` | Add forwardRef to fix console warning |

9 file edits. No migrations.

