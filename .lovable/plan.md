
## Prompt review

Clear and actionable — you described the trigger (mouse exits) and the desired behavior (auto-close). Teaching note: naming the surface ("the date picker popover in the schedule header") would have skipped a discovery step. Micro-improvement: specifying intent around the legend row ("Filling / Tight / Booked") helps me decide whether the close zone includes it — I'll assume yes (the whole popover panel).

## Diagnosis

Need to locate the calendar popover used in the schedule header (visible in screenshot). Based on prior context, this lives near `ScheduleActionBar.tsx`. Most likely a shadcn `Popover` opened on click. The fix is to add hover-leave auto-close behavior on the `PopoverContent` — close after a short delay (~200ms) when the cursor leaves, with a re-entry cancel.

The pattern already exists in the codebase: `HoverPopover.tsx` implements exactly this (open/close with `CLOSE_DELAY = 150ms`, timer cancellation on re-enter). However, that component opens *on hover* — the user wants click-to-open, hover-out-to-close. So the right move is to add `onMouseLeave` / `onMouseEnter` handlers directly to the existing `PopoverContent` with a debounced close.

## Fix

1. Locate the calendar popover (likely `src/components/dashboard/schedule/ScheduleActionBar.tsx` or a date-picker child).
2. Add a small ref-tracked timer:
   - `onMouseLeave` on `PopoverContent` → `setTimeout(close, 200ms)`
   - `onMouseEnter` → clear the timer (covers brief cursor flicker)
3. Clean up the timer on unmount and on manual close.

Keep the click-to-open trigger as-is — only the close behavior changes. 200ms grace period prevents accidental closes when the cursor briefly grazes the edge.

## Acceptance checks

1. Click the date pill → popover opens (unchanged).
2. Move cursor off the popover → closes after ~200ms.
3. Move cursor off then back within 200ms → stays open.
4. Selecting a date still closes the popover (existing behavior preserved).
5. Clicking outside still closes (Radix default preserved).

## Out of scope

- Converting to hover-to-open (would change interaction model).
- Restyling the calendar or legend.
- Touching `HoverPopover` or other popovers platform-wide.

## Files touched

- The schedule header date-picker file (to be confirmed on read — likely `src/components/dashboard/schedule/ScheduleActionBar.tsx` or a `DatePickerPopover` child) — add controlled `open` state + mouse leave/enter handlers with debounced close.
