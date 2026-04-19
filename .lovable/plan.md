

## Diagnosis
In the schedule's top-left corner, "VAL VISTA LAKES" wraps onto three lines and visually outweighs the rest of the header. It's likely rendered with `font-display` at `text-base` or larger, which is too prominent for a contextual label.

## Proposed change
Locate the location label in the schedule header (likely `src/components/dashboard/schedule/DayView.tsx` or a sibling header component like `ScheduleHeader.tsx` / the location column header in the day grid).

Reduce the size from current (likely `text-base`/`text-sm` with `tracking-wide`) down to:
- `text-xs` (12px) with existing `font-display tracking-wider`
- Keep uppercase + Termina styling per typography canon
- This lets "VAL VISTA LAKES" fit on one or two lines instead of three, restoring header balance

If the label is part of a column header in a multi-location grid, also tighten its container padding so the smaller text doesn't leave awkward whitespace.

## Verification
- "VAL VISTA LAKES" wraps to at most 2 lines (ideally 1)
- Still reads as a clear section label, not a headline
- Other locations with shorter names (e.g. "Mesa") remain visually balanced
- No change to font family, weight, or tracking — purely a size reduction

## Prompt feedback
Clear, scoped, and actionable — you named the exact element and the exact change. Even better next time: specify the target size or relative reduction (e.g. "make it ~25% smaller" or "match the time-axis label size"), which removes my one remaining guess. Pattern: **"Element + direction + reference size"** is the tightest visual-tweak prompt shape.

Also worth knowing: small static text/size changes like this are exactly what **Visual Edits** is built for — click the Edit button in the chat box, select the label, and resize it directly without burning a prompt.

## Enhancement suggestions
- Add a tooltip on the location label showing full name + address for cases where it gets truncated.
- Consider a single-line ellipsis with `truncate` so very long location names degrade gracefully instead of stacking.
- Color-code each location header subtly (using the location's brand accent) to reinforce visual identification across columns.

