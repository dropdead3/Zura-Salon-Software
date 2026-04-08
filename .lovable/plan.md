

# Surface Date Range Label on Report Cards

## Problem
Report cards show only the date span (e.g., "Mar 9, 2026 - Apr 7, 2026") but not which preset was selected (e.g., "Last 30 Days"). The user wants both, separated by a bullet: **"Last 30 Days · Mar 9, 2026 – Apr 7, 2026"**.

## Approach

### 1. Create `ReportDateSubtitle` component
**New file:** `src/components/dashboard/reports/ReportDateSubtitle.tsx`

A tiny shared component that accepts `dateRangeKey`, `dateFrom`, `dateTo` and renders:
- If a key is provided and maps to a label: `"Last 30 Days · Mar 9, 2026 – Apr 7, 2026"`
- If no key or `custom`: just the date span (current behavior)

Uses `DATE_RANGE_LABELS` from `@/lib/dateRangeLabels` and `useFormatDate` for consistent formatting.

### 2. Pass `dateRangeKey` from ReportsTabContent to all report components
**Modified file:** `src/components/dashboard/analytics/ReportsTabContent.tsx`

Add `dateRangeKey={filters.dateRange}` prop to every report component in the switch statement (~35 cases). Currently only `IndividualStaffReport` receives it.

### 3. Update report components to accept and use `dateRangeKey`
**Modified files (~15 report components):** Every report that renders a `CardDescription` with the date span will:
- Add `dateRangeKey?: string` to its props interface
- Replace the inline `CardDescription` date formatting with `<ReportDateSubtitle>`

Affected report files:
- `SalesReportGenerator.tsx`
- `StaffKPIReport.tsx` (if applicable)
- `ClientRetentionReport.tsx`
- `NoShowReport.tsx`
- `CapacityReport.tsx`
- `ExecutiveSummaryReport.tsx`
- `FinancialReportGenerator.tsx`
- `RetailProductReport.tsx`
- `RetailStaffReport.tsx`
- `EndOfMonthReport.tsx`
- `PayrollSummaryReport.tsx`
- Plus all Batch 1-4 reports that have `CardDescription` date spans

Point-in-time reports (Permissions Audit, PTO Balances, etc.) that show "Current Snapshot" will keep their existing label — no change needed for those.

## Summary

| Type | Count |
|------|-------|
| New files | 1 (`ReportDateSubtitle.tsx`) |
| Modified files | ~16 (ReportsTabContent + ~15 report components) |
| Migrations | 0 |

