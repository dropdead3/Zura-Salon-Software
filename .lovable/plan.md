

# Add Missing Analytics to Individual Staff Report

## Problem
The Individual Staff Report on the Analytics → Reports tab is missing several key metrics that were built into the Meeting Performance Summary:
- Tip Rate % and Average Tip $ (data exists but not displayed)
- Waste Rate, Waste Cost (requires `useStaffComplianceSummary`)
- Overage Attachment Rate, Overage Charges (same hook)

The data is available — it just isn't surfaced in this view.

## Changes

### 1. Add Tip Rate and Avg Tip to KPI grid
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`**

Add two more KPI cards to the existing `kpis` array (lines 255-264):
- **Tip Rate** — `data.experienceScore.tipRate` formatted as `X.X%`
- **Avg Tip** — calculated as `(revenue.total × tipRate / 100) / completed`

This expands the grid from 8 to 10 tiles (5×2 on desktop).

### 2. Enhance Color Bar section with waste & overage metrics
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`**

- Import and call `useStaffComplianceSummary(selectedStaffId, dateFrom, dateTo)` to get enhanced waste/overage data
- Expand the Color Bar Compliance card (lines 667-698) from 4 columns to include:
  - Waste Rate %
  - Waste Cost $
  - Overage Attachment %
  - Overage Charges $
- Add these metrics to the PDF export and CSV export as well

### 3. Update PDF & CSV exports
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`**

Add the new metrics (tip rate, avg tip, waste, overages) to both the PDF table and CSV output so downloaded reports include the full picture.

## Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/reports/IndividualStaffReport.tsx` | Add tip KPIs, import useStaffComplianceSummary, expand Color Bar section, update exports |

1 file modified. No database changes.

