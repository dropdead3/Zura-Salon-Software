

# Fix Staff Performance Data Accuracy & Date Range Alignment

## Problems Found

Three root causes for inaccurate numbers:

### 1. Broken ID Join (Critical)
`useStaffPerformanceComposite` joins experience scores (keyed by `phorest_staff_id`) with sales data (keyed by `user_id`). These are different ID formats, so the lookup `salesMap.get(score.staffId)` **never matches** — every stylist shows $0 revenue even though sales data exists.

### 2. Hardcoded 30-Day Window (Critical)
The composite hook calls `useStylistExperienceScore(locationId, '30days')` regardless of the date range filter. When a user selects "Last Month" or any custom range, rebook rate, retail %, tip rate, retention, and experience score all reflect the wrong time period.

### 3. Missing Service/Retail Breakdown
Phorest shows Services and Retails as separate columns. Zura only shows a single "Revenue" column, making it impossible to verify accuracy against POS data.

## Verified: Revenue Data Is Correct
DB query confirmed: for Gavin Eagan in March, Zura's `phorest_transaction_items` shows $3,550 services + $306 retail + $25.40 tax = $3,881.40 — matching Phorest exactly. The data is correct; it's the **join and display** that's broken.

## Fix Plan

### File 1: `src/hooks/useStylistExperienceScore.ts`
- Add an overload that accepts explicit `dateFrom`/`dateTo` strings instead of the preset enum
- When custom dates are passed, use them directly instead of computing from the enum
- Map `staffId` output to `user_id` (via `phorest_staff_mapping`) instead of `phorest_staff_id`, so downstream joins work

### File 2: `src/hooks/useStaffPerformanceComposite.ts`
- Pass `dateFrom`/`dateTo` to the experience score hook instead of hardcoded `'30days'`
- Both data sources now keyed by `user_id` — the join works correctly
- Add `serviceRevenue` and `productRevenue` fields to `StaffPerformanceRow` from the sales data

### File 3: `src/components/dashboard/analytics/StaffPerformanceReport.tsx`
- Add "Services" and "Retails" columns to the table (between Stylist and Revenue, or replacing the single Revenue column with Total / Services / Retail)
- Wire the new fields from the composite row data

## Impact
- Revenue numbers will actually display (currently showing $0 due to broken join)
- Rebook/retail/tip/retention metrics will respect the selected time range
- Service vs retail breakdown visible for POS cross-referencing

| File | Change |
|---|---|
| `useStylistExperienceScore.ts` | Accept custom date range, map staffId to user_id |
| `useStaffPerformanceComposite.ts` | Forward date range, fix join, add service/retail fields |
| `StaffPerformanceReport.tsx` | Add Services and Retails columns |

3 files, no database changes.

