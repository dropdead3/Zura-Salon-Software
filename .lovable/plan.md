

# Rename "Compliance" to "Reweigh Reports"

## Scope
UI-facing label rename only. Internal variable names, hook names, and database columns remain unchanged — this is a display-text change across all user-visible surfaces.

## Files to Edit

### 1. `src/pages/dashboard/admin/BackroomSettings.tsx`
- Line 86: Change sidebar label from `'Compliance'` to `'Reweigh Reports'`
- Update tooltip from `'Color/chemical logging compliance tracking.'` to `'Reweigh tracking and accountability reports.'`

### 2. `src/components/dashboard/backroom-settings/BackroomComplianceSection.tsx`
- Line 73: Infotainer title `"Backroom Compliance"` → `"Reweigh Reports"`; update description accordingly
- Line 82: Page heading `"Backroom Compliance"` → `"Reweigh Reports"`
- Line 117: Empty state heading `"No Compliance Data"` → `"No Reweigh Data"`
- Line 128: KPI label `"Compliance Rate"` → `"Reweigh Rate"`
- Line 179: Chart title `"Compliance Trend"` → `"Reweigh Trend"`
- Line 196: Tooltip label `'Compliance'` → `'Reweigh Rate'`
- Line 210: Card title `"Staff Compliance"` → `"Staff Reweigh Rates"`
- Line 211: Tooltip description update to remove "compliance" wording

### 3. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx`
- Line 226: KPI label `"Reweigh Compliance"` → `"Reweigh Rate"`

### 4. `src/components/dashboard/backroom-settings/BackroomInsightsSection.tsx`
- Line 176: Tooltip text — replace `"reweigh compliance"` with `"reweigh rate"`

### 5. `src/pages/dashboard/StylistMixingDashboard.tsx`
- Line 79: StatTile label `"Reweigh Compliance"` → `"Reweigh Rate"`

### Not changed (intentionally)
- Hook names (`useBackroomComplianceTracker`, `useEvaluateComplianceLog`, `useStaffComplianceSummary`) — internal code, no user impact
- Database table/column names (`backroom_compliance_log`, `compliance_status`) — data layer unchanged
- Zura guardrail `'compliance'` rule type — different domain (AI safety rules, not backroom)
- Platform analytics comments — internal developer context
- TypeScript interface names — code internals

