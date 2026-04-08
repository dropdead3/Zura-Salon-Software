

# Build All Missing Reports — Priority Order with Gap Passes

This is a large body of work covering 10 new reports across 6 categories. Each report follows the established pattern: hook for data, report component with table + PDF/CSV export, registration in `ReportsTabContent.tsx` and `reportCatalog.ts`.

## Priority Order and Batching

### Batch 1 — Governance and HR (High Priority)

**Report 1: Staff Milestones (Birthdays and Hire Anniversaries)**
- Data source: `employee_profiles` — has `birthday` (date), `hire_date` (date)
- Hook: `useStaffMilestonesReport.ts` — queries `employee_profiles` for active staff, computes days-until for both birthday and hire anniversary, accepts `daysAhead` and `milestoneType` filter (birthday/anniversary/both)
- Component: `StaffMilestonesReport.tsx` — table with Name, Type (Birthday/Anniversary), Date, Days Until, Years (for anniversaries), Role, Location. PDF + CSV export
- Category: Staff reports

**Report 2: Permissions Audit**
- Data source: `user_roles` (role assignments), `employee_profiles` (names, status, location), `dashboard_element_visibility` (UI visibility config)
- Hook: `usePermissionsAuditReport.ts` — joins `user_roles` with `employee_profiles` to produce a matrix of who has what role, grouped by staff member
- Component: `PermissionsAuditReport.tsx` — table with Staff Name, Roles (badges), Location, Status, Last Login. PDF + CSV export
- Category: Staff reports

**Report 3: Time and Attendance**
- Data source: `time_entries` — has `clock_in`, `clock_out`, `duration_minutes`, `break_minutes`, `location_id`
- Hook: `useTimeAttendanceReport.ts` — aggregates time entries by staff within date range: total hours, avg hours/day, overtime (>8h days), late clock-ins, total break time
- Component: `TimeAttendanceReport.tsx` — table with Staff Name, Days Worked, Total Hours, Avg Hours/Day, Break Hours, Overtime Hours. PDF + CSV export
- Category: Staff reports

### Batch 2 — HR / Culture

**Report 4: PTO Balances**
- Data source: `employee_pto_balances` + `pto_policies`
- Hook: `usePTOBalancesReport.ts` — joins balances with policy names, staff profiles
- Component: `PTOBalancesReport.tsx` — table with Staff Name, Policy, Current Balance, Accrued YTD, Used YTD, Carried Over
- Category: Staff reports

**Report 5: Staff Strikes**
- Data source: `staff_strikes` + `employee_profiles`
- Hook: `useStaffStrikesReport.ts` — queries active/resolved strikes within date range, joins with staff names
- Component: `StaffStrikesReport.tsx` — table with Staff Name, Strike Type, Severity, Title, Incident Date, Status (Active/Resolved), Resolution Notes
- Category: Staff reports

**Report 6: Training Completion**
- Data source: `training_progress` + `training_videos` + `employee_profiles`
- Hook: `useTrainingCompletionReport.ts` — joins progress with video metadata, calculates completion % per staff
- Component: `TrainingCompletionReport.tsx` — table with Staff Name, Videos Completed, Total Required, Completion %, Last Completed Date
- Category: Staff reports

### Batch 3 — Client Intelligence

**Report 7: Client Feedback / NPS**
- Data source: `client_feedback_responses` + `nps_daily_snapshots`
- Hook: `useClientFeedbackReport.ts` — aggregates NPS scores, ratings, and comments within date range
- Component: `ClientFeedbackReport.tsx` — summary tiles (NPS Score, Avg Rating, Promoters/Passives/Detractors) + table of individual responses with Staff, Rating, NPS, Comments
- Category: Clients reports

**Report 8: Churn Risk**
- Data source: `churn_risk_scores`
- Hook: `useChurnRiskReport.ts` — queries risk scores with factors and recommendations
- Component: `ChurnRiskReport.tsx` — summary tiles (High/Medium/Low counts) + table with Risk Level, Score, Factors, Recommendations
- Category: Clients reports

### Batch 4 — Operational / Financial

**Report 9: Booth Renter Summary**
- Data source: `booth_renter_profiles` + `employee_profiles`
- Hook: `useBoothRenterReport.ts` — joins renter profiles with staff info: status, business name, insurance status, start/end dates
- Component: `BoothRenterReport.tsx` — table with Staff Name, Business Name, Status, Start Date, Insurance Status, Insurance Expiry
- Category: Financial reports

**Report 10: Client Formula History**
- Data source: `client_formula_history`
- Hook: `useFormulaHistoryReport.ts` — aggregates formula usage: total formulas recorded, by type, by staff
- Component: `FormulaHistoryReport.tsx` — summary tiles + table with Staff, Client, Service, Formula Type, Date
- Category: Operations reports

## Registration (applies to all reports)

Each report requires updates to 3 files:
1. **`src/config/reportCatalog.ts`** — add entry to `REPORT_CATALOG` array
2. **`src/components/dashboard/analytics/ReportsTabContent.tsx`** — add to category array, import component, add switch case, add to `selfContainedReports`
3. Each report component follows the exact same pattern as `ClientBirthdaysReport.tsx`: Card wrapper, loading skeleton, data table, PDF (jsPDF + autoTable with branded header/footer), CSV export, back button

## File Summary

| Batch | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | 6 hooks + 3 components | `ReportsTabContent.tsx`, `reportCatalog.ts` |
| 2 | 3 hooks + 3 components | `ReportsTabContent.tsx`, `reportCatalog.ts` |
| 3 | 2 hooks + 2 components | `ReportsTabContent.tsx`, `reportCatalog.ts` |
| 4 | 2 hooks + 2 components | `ReportsTabContent.tsx`, `reportCatalog.ts` |

**Total: 13 new hooks, 10 new report components, 2 shared files updated incrementally per batch.**

No migrations needed — all data tables already exist. Gap/bug passes will be run between each batch.

