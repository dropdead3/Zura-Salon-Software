

# Enhanced Employee Performance Table — Vish-Style Columns

## What Changes

The current Employee Performance table shows 5 columns (Staff, Sessions/Day, Avg Duration, Waste %, Reweigh %). The screenshot shows a richer table with: colored initial avatars, service count, product dispensed ($ + grams), product per service ($ + grams), % reweighed, waste per service ($), product charges ($), plus a "Hidden Fields" toggle for extra columns.

## Changes

### 1. Expand `StaffMetric` and `StaffSessionData` in `analytics-engine.ts`
Add fields to `StaffSessionData`:
- `totalProductCost` — already available from `dispensed_cost_snapshot` sum per staff

Add computed fields to `StaffMetric`:
- `totalServices` (session count, not sessions/day)
- `totalProductCost` — total $ dispensed
- `totalDispensedQty` — total grams dispensed
- `productPerServiceCost` — totalProductCost / sessionCount
- `productPerServiceQty` — totalDispensedQty / sessionCount
- `wastePerServiceCost` — (wastePct/100 * totalProductCost) / sessionCount
- `productCharges` — overage charges total (fetched from `checkout_usage_charges`)

### 2. Update `useBackroomAnalytics` to include per-staff product cost
The existing `staffData` aggregation already loops through bowls/lines per staff. Add `totalProductCost` (sum of `dispensed_cost_snapshot`) per staff to `StaffSessionData`.

### 3. Update `useBackroomStaffMetrics` to fetch product charges
After computing base metrics, fetch `checkout_usage_charges` for the session IDs in the period, grouped by staff (via session → staff mapping), and attach `productCharges` to each `StaffMetric`.

### 4. Rewrite Employee Performance table in `BackroomInsightsSection.tsx`
- Add colored initial avatar circles (first letter of name, cycling through 6 colors)
- Default visible columns: Name, Services, Product Dispensed ($+g subtitle), Product Per Service ($+g subtitle), % Reweighed, Waste Per Service ($), Product Charges ($)
- Hidden fields toggle button ("N Hidden Fields ▲/▼") that reveals: Sessions/Day, Avg Duration, Waste %, Variance %
- All columns sortable
- Update CSV export to include all columns

## Files to Edit
1. `src/lib/backroom/analytics-engine.ts` — expand `StaffSessionData` + `StaffMetric` + `calculateStaffEfficiency`
2. `src/hooks/backroom/useBackroomAnalytics.ts` — add `totalProductCost` per staff
3. `src/hooks/backroom/useBackroomStaffMetrics.ts` — fetch product charges, compute new fields
4. `src/components/dashboard/backroom-settings/BackroomInsightsSection.tsx` — rewrite table UI

