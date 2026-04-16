
Good catch — the remaining right-scroll is very likely coming from the slot hover badges, not the columns themselves.

## Root cause
In `DayView.tsx`, each `DroppableSlot` still renders a long absolutely positioned hover label even when it is “hidden” with `opacity-0`. Those hidden elements still contribute to the container’s `scrollWidth`. On the rightmost stylist columns, the label extends past the grid edge, which creates phantom width and the dead-space scroll.

The current screenshot is a strong clue: the visible “THIS TIME SLOT IS NO LONGER AVAILABLE” pill is the same element pattern that can create overflow even when not visible.

## Plan
1. Keep the 120px minimum column width for stylist columns.
2. Measure the actual visible width of the day-view scroll area.
3. Compute:
   - `requiredGridWidth = 70 + stylistCount * MIN_COL_WIDTH`
   - `needsHorizontalScroll = requiredGridWidth > viewportWidth`
4. Only force the grid wider than the viewport when `needsHorizontalScroll` is true. Otherwise keep the inner wrapper at full width so it cannot create extra horizontal space by itself.
5. Refactor `DroppableSlot` hover labels so they do not affect layout width:
   - do not leave wide `opacity-0` labels mounted in every slot
   - render the label only for the hovered slot
   - clamp the label to the slot/column width, or shorten the unavailable copy
   - remove the mouse-follow positioning if it can push the badge beyond the column edge
6. Mirror the same hover-label fix in `WeekView.tsx`, since it uses the same hidden absolute-label pattern and could develop the same bug.

## Files to update
- `src/components/dashboard/schedule/DayView.tsx`
- `src/components/dashboard/schedule/WeekView.tsx`

## Expected result
- No right-scroll when all stylist columns fit at their minimum width
- Horizontal scroll only when there are genuinely more columns than the viewport can show
- No phantom dead space caused by hover overlays
