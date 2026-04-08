

# Report Generator — Intelligence Audit & Gap Analysis

## Current State

The Report Generator has **two rendering paths** that are out of sync:

1. **`ReportsTabContent.tsx`** (legacy, inside Analytics Hub) — 25 report IDs wired, includes Quick Actions, Custom Builder, Scheduled Reports, deep-linking
2. **`ReportsHub.tsx`** (standalone page, new) — only 15 report IDs wired, missing 10 reports, no Custom Builder, no Scheduled Reports

---

## Bug: ReportsHub Is Missing 10 Wired Reports

The standalone ReportsHub `renderSelectedReport` switch does NOT handle these reports that are fully functional in ReportsTabContent:

| Missing from ReportsHub | Component | Category |
|---|---|---|
| `individual-staff` | `IndividualStaffReport` | Staff |
| `retail-products` | `RetailProductReport` | Sales |
| `executive-summary` | `ExecutiveSummaryReport` | Financial |
| `revenue-trend` | `FinancialReportGenerator` | Financial |
| `commission` | `FinancialReportGenerator` | Financial |
| `goals` | `FinancialReportGenerator` | Financial |
| `yoy` | `FinancialReportGenerator` | Financial |
| `payroll-summary` | `PayrollSummaryReport` | Financial |
| `end-of-month` | `EndOfMonthReport` | Financial |
| Custom Builder | `ReportBuilderPage` | Custom |
| Scheduled Reports | `ScheduledReportsSubTab` | Scheduled |

**Fix:** The standalone ReportsHub should import `ReportsTabContent` directly (passing its own filters) rather than duplicating the report catalog and switch statement. This eliminates the sync problem permanently.

---

## Reports Elite Salons Need But Don't Exist

### Tier 1 — High Impact, Data Already Available

| Report | Data Source | Why It Matters |
|---|---|---|
| **Service Profitability P&L** | `service_profitability_snapshots`, economics engine | Owners need to know which services make money vs lose money after labor + chemical costs. Data exists in Color Bar analytics but has no exportable report. |
| **Chemical Cost / Color Bar Report** | `backroom_analytics_snapshots`, `mix_sessions` | Chemical cost per service, waste %, ghost loss — all computed by `analytics-engine.ts` but never surfaced as a downloadable report. |
| **Tip Analysis** | `phorest_transaction_items.tip_amount` | Tip distribution by stylist, tip-to-revenue ratio, trends. Data is already fetched but never aggregated into a report. |
| **Service Category Mix** | `phorest_transaction_items.item_name` + `getServiceCategory()` | Revenue share by category (Color, Cut, Extensions, etc.). The categorization logic exists in `serviceCategorization.ts`. |
| **Tax Summary** | `phorest_transaction_items.tax_amount` | Tax collected by period/location for remittance. Data exists, RevenueDisplayContext uses it, but there's no export. |

### Tier 2 — High Impact, Requires New Query Logic

| Report | Data Needed | Why It Matters |
|---|---|---|
| **Client Attrition / Churn** | Clients with no visit in 60/90/120 days + their historical spend | "Revenue at Risk" — which clients are slipping away and how much they were worth. CLV tiers exist but no churn-specific report. |
| **Staff Compensation Ratio** | Commission resolution + revenue per stylist | Labor cost as % of revenue per stylist. `useResolveCommission` exists but isn't combined into a ratio report. |
| **Location Benchmarking** (multi-loc) | All KPIs aggregated by location | Beyond just sales comparison — includes retention, rebooking, avg ticket, utilization per location side-by-side. |
| **Demand Heatmap** | Appointments by hour × day-of-week | Visual peak-hour analysis. `useCapacityReport` has the raw data but only renders a table. |

### Tier 3 — Strategic, Phase 2+

| Report | Notes |
|---|---|
| **Marketing ROI** | Requires campaign attribution loop (Phase 2 Marketing OS) |
| **Staff Progression / Graduation** | Level movement history over time — data exists in level progress but no historical tracking table |
| **Inventory Valuation** | Color Bar inventory on-hand value — `ColorBarInventoryValuationCard` exists as a card but not as an exportable report |

---

## Implementation Plan

### Phase A: Fix Sync Issue (Prerequisite)
Replace the duplicated report catalog and switch in `ReportsHub.tsx` with a direct render of `ReportsTabContent`, passing the page-level date range and location as filters. This immediately surfaces all 25 existing reports + Custom Builder + Scheduled in the standalone page.

**Files:** `ReportsHub.tsx` (rewrite to use `ReportsTabContent`)

### Phase B: Tier 1 Reports (5 new reports, data ready)

1. **Service Profitability Report** — New component pulling from `useAppointmentProfitSummary` + economics engine. Table: Service name, revenue, chemical cost, labor cost, contribution margin, margin %. PDF + CSV.

2. **Color Bar / Chemical Cost Report** — New component using `getLatestSnapshot` + `getStaffPerformance`. Table: Chemical cost per service, waste %, reweigh compliance, ghost loss. PDF + CSV.

3. **Tip Analysis Report** — New hook querying `phorest_transaction_items` for `tip_amount` grouped by staff + date. Table: Stylist, total tips, avg tip per visit, tip-to-revenue %. PDF + CSV.

4. **Service Category Mix Report** — New hook using existing `getServiceCategory()` to aggregate revenue by category. Pie chart data + table: Category, revenue, % share, transaction count. PDF + CSV.

5. **Tax Summary Report** — New hook aggregating `tax_amount` from `phorest_transaction_items` by period/location. Table: Period, gross revenue, tax collected, net revenue. PDF + CSV.

**New files:** 5 report components + 3 new hooks (tip, category mix, tax)
**Edited files:** `ReportsTabContent.tsx` (add to catalogs + switch)

### Phase C: Tier 2 Reports (4 new reports, new queries)

6. **Client Attrition Report** — Query clients whose last visit exceeds configurable thresholds (60/90/120 days), ranked by CLV tier and revenue-at-risk.

7. **Staff Compensation Ratio** — Combine `useResolveCommission` output with `useSalesByStylist` to show labor cost % per stylist.

8. **Location Benchmarking** — Multi-location KPI matrix: revenue, avg ticket, retention %, rebooking %, utilization %, no-show % per location.

9. **Demand Heatmap** — Visual hour × day grid using capacity data, exportable as image + CSV.

---

## Summary

| Category | Existing | Missing (sync bug) | New Tier 1 | New Tier 2 | Total |
|---|---|---|---|---|---|
| Sales | 6 | 1 (retail-products) | 2 (Category Mix, Tax) | 0 | 9 |
| Staff | 5 | 1 (individual-staff) | 1 (Tip Analysis) | 1 (Comp Ratio) | 8 |
| Clients | 4 | 0 | 0 | 1 (Attrition) | 5 |
| Operations | 4 | 0 | 0 | 1 (Heatmap) | 5 |
| Financial | 7 | 5 (exec, trend, comm, goals, yoy) | 2 (Service P&L, Chem Cost) | 1 (Loc Benchmark) | 10 |
| Custom/Sched | 2 | 2 | 0 | 0 | 2 |
| **Total** | **28** | **9** | **5** | **3** | **39** |

Priority: Phase A first (fix sync bug), then Phase B (5 data-ready reports), then Phase C.

