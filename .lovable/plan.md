

# Capacity Utilization Card — Replace Bar Chart with Progress Fill Bars

## Problem
The daily utilization chart uses a vertical bar chart (Recharts `BarChart`) that looks too similar to the forecasting card. Since each day's utilization is already a 0–100% value, horizontal progress fill bars are a natural, visually distinct representation.

## Solution
Replace the Recharts `BarChart` section (lines 328–448) with a stacked list of daily progress bars. Each row shows the day name, date, utilization percentage, and a horizontal `Progress` fill bar colored by threshold. Closed days render with a moon icon and "Closed" label instead of a bar.

## Visual Structure

```text
┌─────────────────────────────────────────────────┐
│  Fri   Apr 10   ████████████████░░░░░  42%      │
│                                    77.8h open    │
│  Sat   Apr 11   ████████████████████░  51%      │
│                                    66.7h open    │
│  Sun   Apr 12   🌙 Closed                       │
│  Mon   Apr 13   🌙 Closed                       │
│  Tue   Apr 14   ██████████████████░░░  45%      │
│                                    74.7h open    │
│  Wed   Apr 15   ███████████░░░░░░░░░░  29%      │
│                                    95.3h open    │
│  Thu   Apr 16   ██████░░░░░░░░░░░░░░░  18%      │
│                                   111.3h open    │
└─────────────────────────────────────────────────┘
```

- Average utilization dashed reference line replaced by a subtle "Avg: X%" label above the list
- Progress bar color: green (≥70%), amber (50–69%), muted (< 50%) — same thresholds as existing
- Uses existing `Progress` component with `indicatorClassName` for color theming
- Removes all Recharts imports (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `Cell`, `Customized`)

## Changes

### `src/components/dashboard/sales/CapacityUtilizationCard.tsx`
1. Remove Recharts imports and all chart-related helper components (`UtilizationBarLabel`, `DayXAxisTick`, moon icon `Customized`, average line `Customized`)
2. Replace the `{showChart && chartData.length > 0 && ...}` block (lines 328–448) with a new daily progress bar list:
   - Each open day: row with day name + date on left, progress bar in center, percentage + gap hours on right
   - Each closed day: row with day name + date on left, moon icon + "Closed" label
   - Above the list: "Avg: X%" pill (matching existing amber style) aligned left
3. Keep the existing `FALLBACK_COLOR` constant removal since it's only used by the chart
4. Keep all other sections unchanged (header, summary stats, tomorrow view, opportunity callout)

### Files Changed

| File | Change |
|------|-------|
| `src/components/dashboard/sales/CapacityUtilizationCard.tsx` | Replace bar chart with progress bar rows |

