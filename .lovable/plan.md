

# Enhanced Backroom History Chart — Multi-Metric Toggle

The screenshot shows a Vish-style history chart with a rich legend of 9 toggleable metrics (Waste, Services Performed, Percent Waste, Estimated Waste, Percent Reweighed, Product Dispensed, Estimated Product Wasted, Product Dispensed Per Service, Product Waste Per Service) with Daily/Monthly/Yearly granularity. The current Backroom History Chart only shows 3 fixed metrics (Dispensed, Waste, Sessions).

## What Changes

### 1. Enhance `useBackroomHistory` hook
Add these computed fields per bucket (all data sources already exist):
- `reweighPct` — from `reweigh_events` joined via bowls (same pattern as `useBackroomAnalytics`)
- `estimatedWasteCost` — waste qty * avg cost per unit from `dispensed_cost_snapshot`
- `dispensedPerService` — `dispensedQty / sessions`
- `wastePerService` — `wasteQty / sessions`

Fetch `reweigh_events` (bowl_id IN bowlIds) and bucket reweigh counts per period alongside existing session/bowl/line/waste fetches.

### 2. Rewrite `BackroomHistoryChart` component
Replace fixed 3-area chart with a **toggleable multi-metric** chart inspired by the screenshot:

**Legend as clickable toggles** (right side or top):
| Key | Label | Color | Unit | Default On |
|-----|-------|-------|------|------------|
| `wasteQty` | Waste | Orange | g | ✓ |
| `sessions` | Services Performed | Blue | count | ✗ |
| `wastePct` | Percent Waste | Green | % | ✗ |
| `estimatedWasteCost` | Estimated Waste | Purple | $ | ✗ |
| `reweighPct` | Percent Reweighed | Yellow | % | ✗ |
| `dispensedQty` | Product Dispensed | Gray | g | ✓ |
| `estimatedProductWasted` | Est. Product Wasted | Black | g | ✗ |
| `dispensedPerService` | Product Dispensed / Service | Brown | g | ✗ |
| `wastePerService` | Product Waste / Service | Orange-light | g | ✗ |

- Users click legend items to show/hide metrics (stored in local state)
- Default view shows Dispensed + Waste (matching current behavior)
- Granularity toggle stays: Daily / Weekly / Monthly (add Yearly option)
- Area fills for primary metrics, line-only for ratios/percentages
- Custom tooltip shows all active metrics with units

### 3. Add Yearly bucket to `useBackroomHistory`
Add `'yearly'` to `BucketMode` type. Format key as `yyyy`.

## Files
1. **Edit** `src/hooks/backroom/useBackroomHistory.ts` — add reweigh fetch, per-service calcs, yearly bucket, new fields to `HistoryDataPoint`
2. **Edit** `src/components/dashboard/backroom-settings/BackroomHistoryChart.tsx` — toggleable legend, 9 metrics, yearly tab

No new files or DB changes needed.

