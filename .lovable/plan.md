
<final-text>
## Prompt review

Strong prompt: you clearly pointed to the exact visual defect and the expected behavior. A tighter version next time would be:

“In Schedule Day View, when horizontally scrolled, the purple current-time line should span from the first stylist column to the far edge of the last stylist column. It currently stops early.”

That works better because it names the view, the scroll state, and the exact success condition.

## Diagnosis

The previous `right: 0` fix addressed positioning, but not the real width bug.

In `src/components/dashboard/schedule/DayView.tsx`:

- `requiredGridWidth` is calculated from `MIN_COL_WIDTH = 120`
- the actual rendered header/body columns use `min-w-[160px]`
- your screenshot shows the grid is horizontally scrolled, so the time line is being sized against a wrapper that is narrower than the real columns track

That mismatch is why the bar still stops before the last column.

## Fix

Update `src/components/dashboard/schedule/DayView.tsx` so the current-time indicator is sized from the actual stylist-columns track, not the broader row wrapper.

### Changes

1. Create a single source of truth for:
- time gutter width: `70`
- stylist column min width: `160`

2. Replace the old width math:
- remove the `120`-based grid calculation
- compute `requiredGridWidth` from the same `160` min width used by the columns

3. Split the time grid into:
- left time gutter
- right `relative` stylist-columns wrapper

4. Move the current-time indicator inside that right-side stylist-columns wrapper and render it with:
- `left: 0`
- `right: 0`

That makes the line span exactly from the first stylist column edge to the end of the last column, including when horizontally scrolled.

5. Replace duplicated hardcoded column widths where needed so:
- header columns
- body columns
- grid width calculation
all stay in sync.

## File to update

- `src/components/dashboard/schedule/DayView.tsx`

## Acceptance checks

1. In Day View, the purple current-time line reaches the far edge of the last stylist column.
2. It stays correct while horizontally scrolled.
3. It no longer stops early with many stylists visible.
4. Header width, body width, and indicator width stay aligned.
5. Week View remains unchanged.

## Good follow-up improvements

- Make the left time gutter sticky during horizontal scroll.
- Add a small current-time label in Day View to match the stronger Week View affordance.
</final-text>
