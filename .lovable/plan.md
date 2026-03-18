

# Backroom Overview: From Setup Wizard to Command Center

You're right -- the current Overview is purely a setup checklist with a progress bar and config warnings. Once setup is complete, it becomes a dead-end that just says "All systems configured." It needs to become the operational nerve center that admins land on every day.

## The Vision

The Overview should surface **what's happening right now** across the backroom -- not just whether things are configured. Think of it as the "mission control" that answers: What needs my attention? How are we performing? What's at risk?

## Proposed Layout

```text
┌─────────────────────────────────────────────────────┐
│  SETUP BANNER (collapsible, only if incomplete)     │
│  "3 of 6 areas configured" [Resume Setup]           │
└─────────────────────────────────────────────────────┘
┌──────────┬──────────┬──────────┬──────────┬─────────┐
│ Chemical │  Waste   │ Reweigh  │ Stockout │ Budget  │
│ Cost/Svc │  Rate    │ Compli.  │ Alerts   │ Status  │
│  $4.82   │  3.2%    │  91%     │  3 ⚠     │ 72% ██ │
└──────────┴──────────┴──────────┴──────────┴─────────┘
┌────────────────────────┬────────────────────────────┐
│  CONTROL TOWER ALERTS  │  PROCUREMENT SNAPSHOT      │
│  Priority-sorted feed  │  Budget vs Actual bar      │
│  from existing hook    │  Next month projection     │
│  (inventory risk,      │  Recent POs list           │
│   exceptions, margin)  │                            │
├────────────────────────┼────────────────────────────┤
│  STAFF PERFORMANCE     │  INVENTORY HEALTH          │
│  Top/bottom performers │  Low stock items count     │
│  Avg waste rate by     │  Overstock items count     │
│  staff (last 30d)      │  Days of stock remaining   │
│                        │  (from existing hooks)     │
└────────────────────────┴────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  QUICK ACTIONS ROW                                  │
│  [Run Count] [Create PO] [View Exceptions] [Export] │
└─────────────────────────────────────────────────────┘
```

## What We'll Build

### 1. Demote Setup to a Collapsible Banner
- If setup is incomplete, show a compact banner at the top with progress and a "Resume Setup" button
- If complete, hide it entirely
- The wizard remains accessible but no longer dominates the page

### 2. Operational KPI Strip (5 cards)
Using existing hooks (`useBackroomAnalytics`, `useProcurementBudget`, `useStockoutAlerts`):
- **Chemical Cost/Service** -- from `useBackroomAnalytics` (30d)
- **Waste Rate** -- from `useBackroomAnalytics`
- **Reweigh Compliance** -- from `useBackroomAnalytics`
- **Stockout Alerts** -- count from `useStockoutAlerts`
- **Budget Status** -- current month % from `useProcurementBudget` + `useReorderAnalytics`

### 3. Control Tower Alerts Panel
- Use the existing `useControlTowerAlerts` hook (already built -- composes inventory risk, exceptions, staff performance, stockout alerts, margin outliers)
- Show the top 5 priority-sorted alerts with severity badges
- "View All" links to the existing Alerts & Exceptions section

### 4. Procurement Snapshot Card
- Current month spend vs budget (progress bar, color-coded)
- Projected next month spend
- Last 3 POs with status badges (from `purchase_orders` table)

### 5. Staff Performance Summary
- Top 3 and bottom 3 performers by waste rate (from `useBackroomStaffMetrics`)
- Compact table with name, sessions, waste %, reweigh %
- "View Full Report" links to Insights section

### 6. Inventory Health Card
- Counts: low stock items, overstock items, critical items
- Uses existing `useHighRiskInventory` data
- "View Inventory" links to Inventory section

### 7. Quick Actions Row
- Shortcut buttons that navigate to key workflows: Start Count, Create PO, View Exceptions, Export Report

## Files

| File | Action |
|------|--------|
| `BackroomSetupOverview.tsx` | Full rewrite -- rename to `BackroomDashboardOverview.tsx` |
| `BackroomSettings.tsx` | Update import to new component |
| `useBackroomDashboard.ts` (new) | Thin composition hook that calls existing hooks in parallel and shapes data for the overview cards |

## Technical Notes

- **No new database tables or migrations.** Everything is derived from existing hooks: `useBackroomAnalytics`, `useControlTowerAlerts`, `useStockoutAlerts`, `useBackroomStaffMetrics`, `useReorderAnalytics`, `useProcurementBudget`, `useBackroomSetupHealth`.
- The page title in `BackroomSettings.tsx` should also update from "Backroom Settings" to "Zura Backroom" since the Overview is now a dashboard, not just config.
- All cards use the existing `Card`/`CardHeader` primitives and the org's native dashboard theme (warm dark/shadcn), consistent with the rest of the hub.

