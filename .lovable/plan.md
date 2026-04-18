

## Goal
Move the `MetricInfoTooltip` (circle "i") from inline next to the Service/Retail tabs into the **top-right corner of the Top Performers card header**, matching the canonical card header layout (right column reserved for tooltip/badges/toggles).

## Current state
File: `src/components/dashboard/sales/TopPerformersCard.tsx`
- Card header left column: icon box + `CardTitle` ("TOP STAFF")
- The `MetricInfoTooltip` currently sits in `CardContent` adjacent to the `Service`/`Retail` `FilterTabsList`, which violates UI canon ("MetricInfoTooltip immediately after the title, inside the same flex row").

## Change
1. **Add** `MetricInfoTooltip` into the `CardHeader` — either:
   - inline right after `CardTitle` (canon for full-size cards), **or**
   - as the right-column slot via `justify-between`.
   Per the screenshot framing ("top right corner"), use the **right-column slot** so it visually anchors top-right. Wrap header in `flex items-start justify-between` and place the tooltip on the right.
2. **Remove** the `MetricInfoTooltip` from the tabs row in `CardContent`. Tabs row collapses to just `FilterTabsList`.

## Notes
- No copy, threshold, or tooltip-content changes.
- Keep existing icon box + title styling intact.
- No spacing token changes; rely on existing `CardHeader` padding.

## Files
- **Modify**: `src/components/dashboard/sales/TopPerformersCard.tsx` — relocate `MetricInfoTooltip` from tabs row to header right slot.

