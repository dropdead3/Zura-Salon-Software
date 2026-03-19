

# Move KPI Strip Into Command Center Tab

## Problem
The 5 KPI tiles (Chemical Cost, Waste Rate, Reweigh Compliance, Stockout Alerts, Budget) sit above the sub-tabs, taking up space on every tab. They should only appear inside the Command Center tab.

## Changes

### `BackroomDashboardOverview.tsx`
1. **Cut** the KPI strip grid (lines 195-227) from its current position above the `<Tabs>` component
2. **Paste** it as the first child inside the `<TabsContent value="command-center">` block (after line 244), before the two-column Control Tower + Procurement layout
3. No other changes needed — the KPI data references (`kpis.*`, `formatCurrency`) remain in scope

```text
Before:
  [Filters]
  [KPI Strip]        ← always visible
  [Tabs: CC | Analytics | AI]
    [Tab Content]

After:
  [Filters]
  [Tabs: CC | Analytics | AI]
    [Command Center]
      [KPI Strip]    ← only in this tab
      [Control Tower + Procurement]
    [Analytics]
    [AI]
```

### Files to edit
1. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` — move ~32 lines

