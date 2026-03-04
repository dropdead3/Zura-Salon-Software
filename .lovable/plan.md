

## Fix: Daily Operating Avg Badge Overlapping Bar Values

The badge is positioned at the Y-coordinate of the average line (`yPos - 12/14`), which frequently lands right on top of bar values when they're near the average. Both `ForecastingCard.tsx` and `WeekAheadForecast.tsx` have this issue.

### Solution: Position the badge above the chart area

Instead of anchoring the badge at the reference line's Y position (where it collides with bar labels), move the badge to a fixed position **above the chart** (just below the top edge). The dashed reference line still renders at the correct Y position, but the badge floats at the top with a subtle connector line or simply sits detached as a legend-style annotation.

### Changes

**Both `ForecastingCard.tsx` and `WeekAheadForecast.tsx`:**

1. Move the `foreignObject` badge to a fixed Y position near the top of the chart area (e.g., `yAxisMap[0].y + 4`) instead of `yPos - 12/14`
2. Keep the dashed reference line at the correct `yPos`
3. Extend the dashed line across the full chart width (remove the gap for the badge since it's no longer inline)
4. The badge becomes a top-anchored annotation -- visually connected to the line by color/style but spatially separated

### Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/sales/ForecastingCard.tsx` | Move avg badge to top of chart, extend dashed line full width |
| `src/components/dashboard/sales/WeekAheadForecast.tsx` | Same pattern |

