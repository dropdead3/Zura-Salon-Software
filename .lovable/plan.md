

# Enhance Reweigh Reports with Waste, Overage & Staff Integration

## Summary
Expand the Reweigh Reports section to include waste metrics (percentage + dollar amounts), overage attachment rate to appointments, and wire it into the Staff Performance composite and 1:1 meeting reports.

## Current Gaps Identified
1. **Reweigh Reports UI** only shows reweigh rate, color appointment counts, and missing sessions — no waste or cost data
2. **Compliance tracker hook** (`useBackroomComplianceTracker`) reads `backroom_compliance_log` which has no waste/cost columns
3. **Staff compliance summary** (`useStaffComplianceSummary`) used by 1:1 ReportBuilder has no waste or overage data
4. **Staff Performance composite** (`useStaffPerformanceComposite`) already has `wasteRate` and `avgChemicalCostPerService` but missing reweigh compliance rate and overage attachment rate
5. **1:1 ReportBuilder** includes compliance section but not waste $, waste %, or overage attachment info

## Data Sources Available
- `backroom_analytics_snapshots`: has `total_waste_qty`, `waste_pct`, `total_dispensed_qty`, `total_product_cost`
- `waste_events`: per-session waste with `quantity`, `waste_category`, linked to `mix_sessions` and `products`
- `checkout_usage_charges`: overage charges per appointment with `charge_amount`, `overage_qty`, `appointment_id`
- `service_profitability_snapshots`: has `waste_cost`, `overage_revenue` per service/appointment
- `staff_backroom_performance`: has `waste_rate`, `total_product_cost`, `total_dispensed_weight` per staff

---

## Changes

### 1. Enhance `useBackroomComplianceTracker` hook
Add waste and overage aggregation alongside existing compliance data:
- For sessions that exist (`mix_session_id` not null), fetch associated `waste_events` to compute total waste qty and estimated waste cost
- Fetch `checkout_usage_charges` for the same org/date range to compute overage attachment rate (appointments with a charge / total color appointments)
- Add to `ComplianceSummary`: `wasteQty`, `wasteCost`, `wastePct`, `overageAttachmentRate`, `overageChargeTotal`
- Add to `StaffComplianceBreakdown`: `wasteQty`, `wastePct`, `wasteCost`
- Add waste % to trend data points

### 2. Update `BackroomComplianceSection` UI
Add 3 new KPI cards to the existing 4-card grid (make it a 7-card responsive grid):
- **Waste Rate**: Percentage of dispensed product wasted (from waste_events vs dispensed totals)
- **Est. Waste Cost**: Dollar amount of product wasted (waste_qty * avg cost per unit from product cost)
- **Overage Attachment**: % of color appointments that generated an overage/product charge

Update Staff Leaderboard table to add Waste % and Waste $ columns.
Add waste % as a second line on the trend chart (dual-axis or second Area).

### 3. Enhance `useStaffComplianceSummary` for 1:1 reports
Add waste and overage data for the individual staff member:
- Query `waste_events` joined through `mix_sessions` for this staff member's sessions
- Query `checkout_usage_charges` for this staff member's appointments
- Return: `wasteQty`, `wastePct`, `wasteCost`, `overageAttachmentRate`, `overageChargeTotal`

### 4. Update `ReportBuilder` 1:1 report content
Expand the "Backroom Compliance" report section (renamed to "Backroom Performance"):
- Add waste rate %, estimated waste cost
- Add overage attachment rate and total overage charges
- Add coaching callout if waste rate > 15% or overage attachment < salon average

### 5. Wire reweigh + waste into `useStaffPerformanceComposite`
- Add `reweighComplianceRate` field to `StaffPerformanceRow` (sourced from `staff_backroom_performance.reweigh_compliance_rate`)
- Add `overageAttachmentRate` field
- Add coaching signals: "Reweigh rate below 80%" and "Low overage attachment — review checkout workflow"

### 6. Update `StaffPerformanceReport` table
- Add "Reweigh %" sortable column
- Add "Waste $" sortable column
- Update coaching signals expansion row to show new signals

---

## Files to Edit
1. `src/hooks/backroom/useBackroomComplianceTracker.ts` — add waste/overage aggregation
2. `src/components/dashboard/backroom-settings/BackroomComplianceSection.tsx` — add KPI cards, table columns, trend line
3. `src/hooks/backroom/useStaffComplianceSummary.ts` — add waste/overage per-staff data
4. `src/components/coaching/ReportBuilder.tsx` — expand backroom section with waste + overage
5. `src/hooks/useStaffPerformanceComposite.ts` — add reweigh rate + overage attachment
6. `src/components/dashboard/analytics/StaffPerformanceReport.tsx` — add columns + signals

## No DB changes needed
All required data already exists in `waste_events`, `checkout_usage_charges`, `staff_backroom_performance`, and `mix_sessions`.

