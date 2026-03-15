

# Supply Intelligence Enhancements — Phase 3

## 1. Product Cost History Drill-Down Dialog

**What**: Clicking a product row in `ProductCostTrendSection` opens a dialog showing the full cost history timeline with supplier annotations and date stamps.

**Implementation**:
- Create `ProductCostDrilldownDialog.tsx` in `supply-intelligence/`
- Uses existing `useProductCostTrend` hook (already returns `costHistory` array) but needs enriched data — add `costHistoryDetailed` to the hook returning `{ cost, date, supplier }[]` alongside the existing `costHistory: number[]`
- Dialog layout: product name header, current cost + % change, a list of cost entries in reverse chronological order (date, cost, supplier name, % change from previous)
- Uses `DRILLDOWN_DIALOG_CONTENT_CLASS` + `DRILLDOWN_OVERLAY_CLASS` for consistent animation
- Wire into `ProductCostTrendSection`: each row becomes clickable, opens the dialog

**Files**:
- Create: `src/components/dashboard/backroom/supply-intelligence/ProductCostDrilldownDialog.tsx`
- Modify: `src/hooks/backroom/useProductCostTrend.ts` — add `costHistoryDetailed: { cost: number; date: string; supplier: string | null }[]` to `ProductCostTrendItem`
- Modify: `src/components/dashboard/backroom/supply-intelligence/ProductCostTrendSection.tsx` — add click handler + dialog state

## 2. Digest Frequency Settings

**What**: Per-org setting (daily/weekly/off) stored in `backroom_settings` with key `supply_digest_frequency`. The digest edge function reads this before sending.

**Implementation**:
- Add a "Digest Frequency" control to the Supply Intelligence dashboard header area (dropdown: Off / Daily / Weekly)
- Uses existing `useBackroomSetting('supply_digest_frequency')` + `useUpsertBackroomSetting()` — no new hooks needed
- Default value: `{ frequency: 'weekly' }` when no setting exists
- Modify `supply-intelligence-digest` edge function to read `backroom_settings` for each org and skip if `frequency === 'off'`, or check day-of-week for weekly vs daily

**Files**:
- Modify: `src/components/dashboard/backroom/supply-intelligence/SupplyIntelligenceDashboard.tsx` — add digest frequency selector
- Modify: `supabase/functions/supply-intelligence-digest/index.ts` — read frequency setting per org

## 3. Cost Alert Thresholds with Real-Time Notifications

**What**: When the `log_cost_price_change` trigger fires and the cost increase exceeds a configurable threshold (default 10%), a notification is created for the org owner.

**Implementation**:
- Store threshold in `backroom_settings` with key `cost_alert_threshold` (value: `{ threshold_pct: 10, enabled: true }`)
- Modify the existing `log_cost_price_change()` DB trigger function to also check the threshold and insert a notification via a new helper function `notify_cost_spike`
- Actually, DB triggers can't easily call edge functions. Better approach: create a lightweight DB function `check_cost_alert_threshold()` called from the existing trigger that inserts directly into `platform_notifications` when the % change exceeds the threshold
- Add a threshold config UI in the Supply Intelligence dashboard (simple toggle + percentage input)

**DB changes** (migration):
- New function `check_cost_alert_threshold()` — called from within the updated `log_cost_price_change` trigger
- Reads threshold from `backroom_settings` for the product's org
- If `((new_cost - old_cost) / old_cost) * 100 > threshold`, inserts into `platform_notifications`

**UI**:
- Add "Cost Alerts" config section in `SupplyIntelligenceDashboard` — toggle + threshold % input
- Uses `useBackroomSetting('cost_alert_threshold')` + `useUpsertBackroomSetting()`

**Files**:
- Create: DB migration for `check_cost_alert_threshold()` function + update `log_cost_price_change` trigger
- Modify: `src/components/dashboard/backroom/supply-intelligence/SupplyIntelligenceDashboard.tsx` — add cost alert threshold config + digest frequency selector

## Summary

| Item | New Files | Modified Files | DB Migration |
|------|-----------|----------------|-------------|
| Cost history drill-down | 1 component | 2 (hook + section) | No |
| Digest frequency settings | 0 | 2 (dashboard + edge fn) | No |
| Cost alert thresholds | 0 | 1 (dashboard) | Yes (1 function + trigger update) |

