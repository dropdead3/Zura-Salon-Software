

# Empty Data Guidance & Date Range Subtitle Display

## Problem

1. When all analytics are zero (e.g., filter set to "Today" on a day with no sales), every KPI shows $0.00 / 0 with no explanation — users think the data is broken.
2. The selected date range (e.g., "Last Month") doesn't show the actual dates (e.g., "Mar 1 – Mar 31"), so users lack context about what period they're viewing.

## Solution

### 1. Add an "Empty Data" banner to IndividualStaffReport

When `data` is loaded but all key metrics are zero (revenue=0, appointments=0), show an informational banner above the KPI grid:

- Uses `AlertTriangle` icon (already imported)
- Advisory tone: "No activity was recorded for this period. This is common when the filter is set to 'Today' and no appointments have occurred yet. Try selecting a wider date range like 'Last 30 Days' or 'Last Month'."
- Styled as a muted card with amber accent — not an error, just guidance

**Detection logic**: `data.revenue.total === 0 && data.productivity.totalAppointments === 0`

### 2. Show date range subtitle in the report profile banner

Pass `dateRange` key (e.g., `'today'`, `'lastMonth'`) as a new prop to `IndividualStaffReport`. Display both the label and the computed date span below the profile banner or next to the dates:

- Example: **Last Month** · Mar 1 – Mar 31
- Uses `getDateRangeSubtitle()` from `@/lib/dateRangeLabels` and `DATE_RANGE_LABELS`
- Falls back to showing just `dateFrom – dateTo` formatted if no range key is provided

### 3. Thread `dateRange` key from filters

`ReportsTabContent` already receives `filters` which includes `dateRange`. Pass `filters.dateRange` to `IndividualStaffReport` as a new `dateRangeKey` prop.

### 4. Apply similar empty-state guidance to other reports

Add the same empty-data banner pattern to:
- `FinancialReportGenerator` (already has "No revenue data for this period" — enhance with suggestion)
- `NoShowReport` (already has empty state — enhance with suggestion)
- `MeetingPerformanceSummary` (trailing 30d, less likely but consistent)

## Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/reports/IndividualStaffReport.tsx` | Add `dateRangeKey` prop, date range subtitle display, empty data banner |
| `src/components/dashboard/analytics/ReportsTabContent.tsx` | Pass `filters.dateRange` to IndividualStaffReport |
| `src/components/dashboard/reports/FinancialReportGenerator.tsx` | Enhance empty state with date range guidance |
| `src/components/dashboard/reports/NoShowReport.tsx` | Enhance empty state with date range guidance |
| `src/components/coaching/MeetingPerformanceSummary.tsx` | Add empty data guidance |

5 files modified, no database changes.

