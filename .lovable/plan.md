

## Phorest-Disconnected Gap Analysis — Zura-Only Operations

This analysis identifies every place the codebase assumes Phorest tables contain data. When Phorest is disconnected and all appointments, clients, and transactions originate in Zura-native tables (`appointments`, `clients`, `transaction_items`), these hardcoded references cause **empty dashboards, broken analytics, and missing forecasts**.

---

### Scope of the Problem

Union views (`v_all_appointments`, `v_all_clients`, `v_all_transaction_items`) exist specifically to merge Phorest and Zura data. However, **the vast majority of hooks query Phorest tables directly**, bypassing these views entirely.

**By the numbers:**
- `phorest_appointments` — queried directly in **79 files**
- `phorest_transaction_items` — queried directly in **57 files**
- `phorest_clients` — queried directly in **37 files**
- `v_all_*` views — used in only **25 files** (mostly batch reports)

This means ~75% of the analytics surface goes dark when Phorest is off.

---

### Category 1: Analytics Hooks Hardcoded to Phorest Tables (P0 — Data Goes Dark)

These hooks return **empty results** for Zura-only orgs because no data exists in `phorest_*` tables:

| Hook | Table Used | Should Use |
|------|-----------|------------|
| `useForecastRevenue` | `phorest_appointments` | `v_all_appointments` |
| `useStylistIncomeForecast` | `phorest_appointments` | `v_all_appointments` |
| `useAvgTicketByStylist` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useRevenueGapAnalysis` | `phorest_appointments` + `phorest_clients` | `v_all_appointments` + `v_all_clients` |
| `useTipsDrilldown` | `phorest_appointments` + `phorest_transaction_items` + `phorest_staff_mapping` | `v_all_*` views |
| `useRedoAnalytics` | `phorest_appointments` | `v_all_appointments` |
| `useDemandHeatmap` | `phorest_appointments` | `v_all_appointments` |
| `useTransactionsByHour` | `phorest_appointments` | `v_all_appointments` |
| `useHistoricalCapacityUtilization` | `phorest_appointments` | `v_all_appointments` |
| `useRetailAttachmentRate` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useClientTypeSplit` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useProductCoPurchase` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useRealizationRate` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useOrganizationAnalytics` | `phorest_transaction_items` | `v_all_transaction_items` |
| `usePayrollCalculations` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useStylistPeerAverages` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useStylistExperienceScore` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useYearlyGoalProgress` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useServiceProductDrilldown` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useQuickStats` | `phorest_clients` | `v_all_clients` |
| `useOperationalAnalytics` | `phorest_clients` | `v_all_clients` |
| `usePhorestSync` (weekly stats) | `phorest_appointments` | `v_all_appointments` |

**Plus ~15 more hooks** in similar patterns.

### Category 2: Staff Identity Resolution (P1 — Names Show "Unknown")

Many hooks use `phorest_staff_id` and `resolveStaffNamesByPhorestIds()` to map staff. In Zura-only mode:
- `staff_user_id` is the canonical field (not `phorest_staff_id`)
- `phorest_staff_mapping` table is empty
- Staff names should come from `employee_profiles` or the `staff_name` column on `appointments`

Affected: `useForecastRevenue`, `useAvgTicketByStylist`, `useTipsDrilldown`, `useRevenueGapAnalysis`, and others that call `resolveStaffNamesByPhorestIds`.

### Category 3: Client Identity Resolution (P1 — Client Lookups Fail)

Hooks use `phorest_client_id` to join appointments to client records in `phorest_clients`. In Zura-only mode, `client_id` references the `clients` table instead.

Affected: `useTodayPrep`, `useAppointmentTransactionBreakdown`, `ClientDirectory`, `Schedule.tsx` client sheet, `DockClientQuickView`.

### Category 4: Schedule Page Client Detail (P1)

`Schedule.tsx` line 658-662 fetches client data via `phorest_clients.phorest_client_id`. A Zura-native appointment has `client_id` pointing to `clients`, so tapping a client on the schedule opens an empty sheet.

### Category 5: Sidebar Sync Widget Shows for Zura-Only Orgs (P2 — UX Confusion)

`SidebarSyncStatusWidget` queries `phorest_sync_log` and always renders. For Zura-only orgs with no Phorest connection, this shows a stale/unknown sync status, confusing operators.

### Category 6: Appointments Hub Dual-Query (P2 — Duplicate Results When Both Populated)

`useAppointmentsHub` queries both `phorest_appointments` AND `appointments` then merges. When Phorest is off, the Phorest query returns empty (harmless), but the merging logic adds unnecessary complexity and potential for duplicates if an appointment exists in both tables.

---

### Recommended Implementation Strategy

Rather than editing 79+ files individually, the fix is architectural:

**Phase A — View Migration (bulk fix):**
1. In every hook listed in Category 1, replace `from('phorest_appointments')` → `from('v_all_appointments')`, `from('phorest_transaction_items')` → `from('v_all_transaction_items')`, and `from('phorest_clients')` → `from('v_all_clients')`.
2. Update column references: `phorest_staff_id` → use the view's normalized `stylist_user_id` or `staff_name`; `phorest_client_id` → use view's normalized `phorest_client_id` (which maps both sources).

**Phase B — Staff Resolution Fallback:**
3. Update `resolveStaffNamesByPhorestIds` to also accept `staff_user_id` and resolve from `employee_profiles` when no Phorest mapping exists.

**Phase C — Client Resolution Fallback:**
4. Update client lookup paths (Schedule, Dock, TodayPrep) to check `client_id` → `clients` table when `phorest_client_id` is null.

**Phase D — Conditional UI:**
5. Hide `SidebarSyncStatusWidget` and `PhorestSyncButton` when the org has no Phorest connection (check `organization_pos_config.pos_type` or absence of sync log entries).

---

### Implementation Summary

| Priority | Category | Scope | Change |
|----------|----------|-------|--------|
| P0 | Analytics hooks (22+ hooks) | ~30 files | Replace direct `phorest_*` table refs with `v_all_*` views |
| P1 | Staff name resolution | 1 utility + column refs | Add `employee_profiles` fallback path |
| P1 | Client identity resolution | ~8 files | Add `clients` table fallback when `phorest_client_id` is null |
| P1 | Schedule client detail | 1 file | Resolve client from `clients` when `client_id` is present |
| P2 | Sync widget visibility | 2 components | Conditionally hide when no POS connection |
| P2 | AppointmentsHub dedup | 1 file | Simplify to use `v_all_appointments` instead of dual-query |

No database migrations required — the views already exist.

**This is a large-scope migration (~40 files).** I recommend tackling it in batches: start with P0 analytics hooks (the 22 hooks above), then P1 identity resolution, then P2 UX cleanup. Shall I proceed with Phase A first?

