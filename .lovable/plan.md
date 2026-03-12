

# 5 Owner-Switch Features — Assessment & Implementation Plan

## Current State Analysis

Most of these features **already exist** in the codebase in some form. The gap is not building from scratch — it's surfacing, compositing, and elevating existing data into owner-facing dashboards.

| Feature | Existing Infrastructure | Gap |
|---|---|---|
| 1. True Profit Dashboard | `useAppointmentProfitSummary` has totalRevenue, totalMargin, chemicalCost, laborEstimate, wasteCost. `ProfitDashboardSummary`, `ProfitByServiceTable`, `ProfitTrendChart` exist. | No unified "Today's P&L" card on the Command Center. Existing components are backroom-scoped, not owner-facing. Need a top-level `TrueProfitCard` that shows Revenue → Costs → Net Profit. |
| 2. Staff Performance Intelligence | `StylistExperienceCard` scores stylists on rebook rate (35%), tip rate (30%), retention (20%). `StaffRevenueLeaderboard` exists. Backroom has `useStaffBackroomPerformance` for chemical cost per stylist. | No unified per-stylist report combining revenue + rebook + retail + chemical cost + avg service time. Need a `StaffPerformanceReport` that composites existing hooks. |
| 3. Predictive Inventory | `useDemandForecast`, `useStockoutAlerts`, `StockoutAlertCard`, `PredictiveBackroomSummary` all exist and are functional. | Already built. Needs wiring into Command Center as a pinnable card if not already. |
| 4. Real Service Profitability | `ProfitByServiceTable` with `rankServicesByMargin()` already ranks services by contribution margin. `AppointmentProfitCard` shows per-service breakdown. | Already built. Need an owner-facing `ServiceProfitabilityCard` that shows the comparison view (side-by-side services ranked by margin) on the Command Center. |
| 5. Control Tower | `BackroomControlTower` with alert aggregation, priority scoring, category filters — fully implemented. | Already built. Needs integration into the owner's Command Center as a pinnable card. |

## What Actually Needs Building

### 1. TrueProfitCard — Owner-facing P&L summary

New component: `src/components/dashboard/sales/TrueProfitCard.tsx`

- Composites `useAppointmentProfitSummary` + `useTodayActualRevenue` 
- Shows: Revenue | Chemical Cost | Labor Cost | Waste | **Net Profit**
- Profit margin health indicator (green/amber/red)
- Trend sparkline from `trendByDay`
- Pinnable to Command Center via existing `PinnableCard` pattern
- Register in `CommandCenterAnalytics.tsx` CARD_COMPONENTS

### 2. StaffPerformanceReport — Unified stylist scorecard

New component: `src/components/dashboard/analytics/StaffPerformanceReport.tsx`

- Composites: `useStylistExperienceScore` (rebook, tip, retention) + `useSalesByStylist` (revenue) + `useStaffBackroomPerformance` (chemical cost, waste rate)
- Per-stylist row: Revenue | Rebook Rate | Retail Conversion | Chemical Cost/Service | Avg Service Time
- Sortable by any column
- Expandable row with coaching signals (e.g., "Chemical cost 25% above salon average")
- New hook: `src/hooks/useStaffPerformanceComposite.ts` — merges the 3 data sources by `user_id`
- Register as pinnable card

### 3. Wire existing features into Command Center

- Add `BackroomControlTower` as a pinnable card in `CommandCenterAnalytics`
- Add `StockoutAlertCard` / `PredictiveBackroomSummary` as a pinnable card
- Add `ServiceProfitabilityCard` (wrapper around `ProfitByServiceTable`) as a pinnable card

## Build Order

1. `useStaffPerformanceComposite.ts` — merge hook combining experience scores + revenue + backroom metrics
2. `TrueProfitCard.tsx` — owner P&L card
3. `StaffPerformanceReport.tsx` — unified stylist scorecard
4. `ServiceProfitabilityCard.tsx` — owner-facing service comparison wrapper
5. Wire all 5 features into `CommandCenterAnalytics.tsx` as pinnable cards

## No Database Changes Required

All data sources already exist. This is a composition and presentation layer build.

