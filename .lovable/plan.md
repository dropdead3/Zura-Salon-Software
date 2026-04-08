

# Comprehensive Phorest Detach Readiness: Remaining Analytics Gaps

## Context

The POS-First migration (switching revenue from `phorest_daily_sales_summary` to `phorest_transaction_items`) is complete across 19 files. However, the codebase still has **~150 files** directly querying `phorest_*` tables. When Phorest is disconnected, these tables stop receiving data and analytics break.

This plan identifies every remaining gap categorized by risk, and the strategy to make analytics work standalone.

---

## The Two-Table Problem

The system has **dual schemas** for core entities:

| Domain | Phorest Table | Zura-Owned Table | Analytics Impact |
|---|---|---|---|
| Appointments | `phorest_appointments` (85 files) | `appointments` (29 files) | Revenue, utilization, scheduling |
| Clients | `phorest_clients` (38 files) | `clients` (10 files) | Retention, new clients, directories |
| Services | `phorest_services` (18 files) | `services` (26 files) | Service popularity, booking |
| Staff | `phorest_staff_mapping` (41 files) | `employee_profiles` | Staff KPIs, name resolution |
| Transactions | `phorest_transaction_items` (53 files) | *(no Zura equivalent)* | All revenue analytics |
| Perf Metrics | `phorest_performance_metrics` (7 files) | *(no Zura equivalent)* | Rebooking, retention, KPIs |

**Critical gap**: `phorest_transaction_items` has no Zura-owned equivalent. This is the table we just migrated everything TO. When Phorest is disconnected, ALL revenue analytics break again unless we either:
1. Create a Zura-owned `transaction_items` table and populate it from native POS, OR
2. Continue syncing into `phorest_transaction_items` from the Zura POS (rename it)

---

## Strategy: Rename + Dual-Write, Not Rewrite

Rather than rewriting 150+ files to use new table names, the pragmatic approach:

1. **Create Zura-owned canonical tables** (`transaction_items`, `performance_snapshots`) that mirror the Phorest schemas
2. **Create database views** that UNION both sources (e.g., `v_transaction_items` reads from both `phorest_transaction_items` AND `transaction_items`)
3. **Migrate analytics hooks to views** — one change per hook instead of architectural rewrites
4. **Ensure the Zura booking/POS flow writes to the canonical tables** so data flows even without Phorest

However, that's a large architectural migration beyond "fix analytics." For THIS phase, the actionable gaps are hooks that will show **wrong data right now** or **break on detach**.

---

## Phase A: Revenue Hooks Still Using `appointments.total_price` (Includes Tips — Wrong Now)

These hooks use `phorest_appointments.total_price` for revenue, which includes tips and doesn't match POS actuals. They should use `phorest_transaction_items` like the hooks we already fixed.

| # | File | Issue |
|---|---|---|
| 1 | `useGoalPeriodRevenue.ts` | Sums `total_price` from appointments for goal tracking — inflated by tips |
| 2 | `useStylistIncomeForecast.ts` | Uses `total_price` for booked revenue / commission estimates |
| 3 | `useTomorrowRevenue.ts` | Uses `total_price` for tomorrow's forecast — includes tips |
| 4 | `useAvgTicketByStylist.ts` | Avg ticket from `total_price` — inflated |
| 5 | `useRevenueByCategoryDrilldown.ts` | Category revenue from `total_price` |
| 6 | `useServiceClientAnalysis.ts` | Service analysis using `total_price` for tip % calculation |
| 7 | `useStaffKPIReport.ts` | Staff KPI revenue from `total_price` |
| 8 | `useSalesAnalytics.ts` (service popularity) | Service revenue from `total_price` |
| 9 | `useCapacityUtilization.ts` | Revenue per hour from `total_price` |
| 10 | `useHistoricalCapacityUtilization.ts` | Historical revenue from `total_price` |
| 11 | `useNoShowReport.ts` | Revenue lost from `total_price` (acceptable — estimate) |
| 12 | `useClientTypeSplit.ts` | Client segment revenue from `total_price` |
| 13 | `useServiceEfficiency.ts` | Service efficiency revenue from `total_price` |
| 14 | `useWeekAheadRevenue.ts` | Week-ahead forecast from `total_price` |

**Fix**: Switch revenue aggregation to `phorest_transaction_items` (same pattern already proven). For forecast hooks (tomorrow, week-ahead, stylist income) where transactions don't exist yet, `total_price` minus `tip_amount` is the correct approximation.

## Phase B: Client Analytics on `phorest_clients` (Break on Detach)

| # | File | Issue |
|---|---|---|
| 1 | `useQuickStats.ts` | New clients count from `phorest_clients.first_visit` |
| 2 | `useClientHealthSegments.ts` | All client segmentation from `phorest_clients` |
| 3 | `useClientRetentionReport.ts` | Retention analysis from `phorest_clients` |
| 4 | `useOrganizationAnalytics.ts` | Client count from `phorest_clients` |
| 5 | `ClientDirectory.tsx` | Main client list from `phorest_clients` |

**Fix**: These should query `clients` (Zura-owned) with fallback to `phorest_clients`. The `clients` table already exists and is used by the booking system.

## Phase C: Staff Name Resolution via `phorest_staff_mapping` (Break on Detach)

41 files resolve staff names through `phorest_staff_mapping`. Post-detach, this table has no new entries.

**Fix**: Staff resolution should prefer `employee_profiles` (Zura-owned, has `display_name`, `full_name`, `user_id`) and fall back to `phorest_staff_mapping` for historical data. A utility function `resolveStaffName(userId)` would centralize this.

## Phase D: `phorest_performance_metrics` (Already Partially Stale)

7 files query this for rebooking rates, retention, new client counts. This data comes from Phorest sync and may already be stale.

**Fix**: These metrics should be computed from `phorest_appointments` (rebooking) and `phorest_transaction_items` (retail) directly, which is what the level progress system already does.

---

## Recommended Implementation Order

### Batch 1 — Fix Wrong Revenue Now (Phase A, 14 files)
Switch all `total_price`-based revenue hooks to `phorest_transaction_items`. For future-dated appointments (forecasts), use `total_price - tip_amount`.

### Batch 2 — Client Analytics Dual-Source (Phase B, 5 files)
Add `clients` table as primary source with `phorest_clients` fallback.

### Batch 3 — Staff Resolution Centralization (Phase C)
Create `resolveStaffNames()` utility using `employee_profiles` first, `phorest_staff_mapping` as fallback. Update high-impact hooks.

### Batch 4 — Performance Metrics Computation (Phase D)
Replace `phorest_performance_metrics` reads with live computations from appointments + transactions.

### Batch 5 — Zura POS Transaction Table (Future)
Create `transaction_items` Zura-owned table so native POS writes have somewhere to go post-detach. This is the critical missing piece.

---

## Files Changed (Batch 1 — Immediate)

| File | Change |
|---|---|
| `useGoalPeriodRevenue.ts` | Switch to `phorest_transaction_items` |
| `useStylistIncomeForecast.ts` | Use transactions for completed, `total_price - tip_amount` for pending |
| `useTomorrowRevenue.ts` | Use `total_price - tip_amount` for forecast |
| `useAvgTicketByStylist.ts` | Switch to transactions, unique client+date denominator |
| `useRevenueByCategoryDrilldown.ts` | Switch to transactions |
| `useServiceClientAnalysis.ts` | Switch revenue to transactions |
| `useStaffKPIReport.ts` | Switch revenue to transactions |
| `useSalesAnalytics.ts` | Switch service popularity revenue to transactions |
| `useCapacityUtilization.ts` | Switch revenue to transactions |
| `useHistoricalCapacityUtilization.ts` | Switch revenue to transactions |
| `useClientTypeSplit.ts` | Switch revenue to transactions |
| `useServiceEfficiency.ts` | Switch revenue to transactions |
| `useWeekAheadRevenue.ts` | Use `total_price - tip_amount` for forecast |
| `useNoShowReport.ts` | Use `total_price - tip_amount` for lost revenue estimate |

14 files, no database changes for Batch 1.

Shall I proceed with Batch 1, or tackle all batches sequentially?

