

## Goal
Add a clarifying line to the Top Performers metric tooltip so users understand why amounts show no cents.

## Where
`src/components/dashboard/sales/TopPerformersCard.tsx` — the `MetricInfoTooltip` description prop next to the card title.

## Change
Append a second sentence to the existing description:

> "Ranks your team by service revenue or retail sales in the selected period. Amounts are rounded to the nearest dollar for a cleaner read."

Calm declarative tone, no exclamation, on brand-voice.

## Out of scope
- Tooltip layout / styling
- Sweeping other cards (none currently round to whole dollars in the Sales hub)

## Files
- **Modify**: `src/components/dashboard/sales/TopPerformersCard.tsx` (one string)

