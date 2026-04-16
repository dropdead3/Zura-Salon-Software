<final-text>## Prompt review

Good catch — this is a strong follow-up prompt because you identified that the first fix improved things but didn’t fully solve the visual edge case. Better prompt framing for spacing/render bugs: mention whether the spill is a full-slot issue or a thin 1–2px halo. That helps distinguish logic bugs from paint/rounding bugs faster.

## What’s likely happening

The big logic bug is already fixed: the past state is no longer painted per 15-minute slot.

What’s left appears to be a rendering precision issue:
- `DayView.tsx` and `WeekView.tsx` still use the raw fractional `currentTimeOffset`
- the purple indicator is drawn as a `border-t-2`
- the gray overlay height is set separately with the same raw value

That combination can still leave a faint visual spill because the overlay edge and the visible 2px line are not snapped to the same painted pixel boundary.

There’s also duplicated logic in both views, which makes it easy for these tiny visual mismatches to persist.

## Fix plan

1. Add a shared helper in `src/lib/schedule-utils.ts`
   - Return a pixel-snapped current-time position for rendering
   - Return a separate past-overlay height that stops exactly at the visible indicator bar
   - Clamp both values to the grid height

2. Update `DayView.tsx`
   - Replace raw `currentTimeOffset` usage with the shared snapped values
   - Use the snapped line position for the purple bar
   - Use the overlay height derived from the helper so the gray ends exactly at the bar
   - Keep `isPastSlot` only for interaction rules and the “Unavailable” badge

3. Update `WeekView.tsx`
   - Apply the same shared helper so Day and Week render identically
   - Use the same snapped values for both the gray overlay and current-time line

4. Tighten the visual edge
   - If needed, subtract 1px from the overlay height or shift the line by 1px so the visible boundary is crisp at all zoom levels
   - This is the small final tuning pass after applying the shared helper

## Acceptance checks

- Gray past overlay stops exactly at the purple current-time line
- No visible spill below the line at 100% or 200% zoom
- The current slot is only gray above the line and clear below it
- Day view and Week view behave the same
- Past slots remain unavailable for interaction

## Files to touch

- `src/lib/schedule-utils.ts`
- `src/components/dashboard/schedule/DayView.tsx`
- `src/components/dashboard/schedule/WeekView.tsx`

## Further enhancement suggestions

- Add a single shared “current time render metrics” helper so all schedule surfaces stay visually identical
- Do a quick sweep for other schedule overlays using raw fractional offsets
- Verify the final boundary in both normal view and God Mode so the visual line stays crisp across contexts</final-text>