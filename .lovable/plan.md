

## Goal
Two refinements to the **Tips** card on the dashboard:
1. Move the `MetricInfoTooltip` (circle "i") from inline next to the title to the **top-right corner** of the card.
2. Hide the "Average Tip Rate" subtitle when it would crowd the value or wrap to a second line.

## Investigation needed
Need to locate the Tips card component. Likely under `src/components/dashboard/` — candidates: `TipsCard.tsx`, `AverageTipRateCard.tsx`, or similar. Will search for the literal "TIPS" + "Average Tip Rate" strings.

## Change

### 1. Tooltip relocation (mirror Top Staff card pattern)
- Add `relative` to the outer `Card`.
- Place `MetricInfoTooltip` as `absolute top-3 right-3 z-10`.
- Remove inline tooltip from the header row.
- Add `pr-6` to the header content container so the value/chevron don't collide with the absolute icon.

### 2. Adaptive subtitle hiding
"Average Tip Rate" currently wraps to two lines at this width because it sits between the "TIPS" label and the "15.1%" value. Hide it responsively:
- Wrap subtitle in `hidden lg:inline` (or `xl:` depending on actual breakpoint where it wraps — verify against screenshot at 1394px viewport).
- Add `truncate whitespace-nowrap` so even when shown, it won't break to a second line — it will simply ellipsize, then disappear at narrower breakpoints.
- Combined: `hidden xl:inline truncate whitespace-nowrap` keeps it visible only when there's real horizontal room.

## Out of scope
- Changing the "15.1%" value, source hook, or expand/collapse behavior
- Restyling the `$` icon box (that's the canonical `tokens.card.iconBox` — keep it)
- Renaming "TIPS" or the subtitle copy

## Files
- **Locate & modify**: the Tips card component (search target: `TIPS` + `Average Tip Rate`) — likely `src/components/dashboard/sales/TipsCard.tsx` or under `dashboard/analytics/`.

