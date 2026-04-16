

## Diagnosis

The `onMouseLeave={() => setOpen(false)}` handler IS present on `LocationGroupSelect`'s `PopoverContent` (line 120) and matches the working pattern from `ScheduleHeader.tsx` staff popover and `CalendarFiltersPopover.tsx`.

The reason it feels "not closing" is the **4px `sideOffset` gap** between the trigger button and the popover content (defined in `popover.tsx`). When the user moves their cursor from the trigger downward toward the popover, crossing that gap can fire `mouseleave` on the trigger but never `mouseenter` on the content — or vice versa on exit, the cursor briefly re-enters the gap and the popover stays mounted because Radix only closes on outside-click by default.

The staff and calendar popovers happen to work because they're `align="end"` (right-aligned, opening down-right where the user's natural exit path leaves cleanly). `LocationGroupSelect` uses `align="start"` and is the leftmost element — different exit geometry exposes the gap problem.

## Fix

Wrap the `PopoverContent` interaction zone so `mouseleave` reliably fires, and bridge the 4px gap by adding a small invisible hover-bridge. Two minimal changes in `src/components/ui/LocationGroupSelect.tsx`:

1. **Bridge the gap**: Set `sideOffset={0}` on `PopoverContent` so there's no dead zone between trigger and content.
2. **Trigger-aware close**: Add `onMouseLeave={() => setOpen(false)}` to the `PopoverTrigger`'s `Button` as well, but guard with a short timeout that gets cancelled if the cursor enters the `PopoverContent` (standard hover-menu pattern).

Simpler alternative (preferred — single change): Just set `sideOffset={0}` on the `PopoverContent`. This eliminates the gap and the existing `onMouseLeave` handler will then fire reliably as the cursor exits the content boundary.

### Change

In `src/components/ui/LocationGroupSelect.tsx` line 120:

```tsx
<PopoverContent
  className="w-[260px] p-0"
  align="start"
  sideOffset={0}
  onMouseLeave={() => setOpen(false)}
>
```

### Files touched

- `src/components/ui/LocationGroupSelect.tsx` (one prop addition)

### Out of scope

- No changes to staff/calendar popovers (they work via different alignment geometry)
- No changes to shared `popover.tsx` default `sideOffset` (would affect all popovers globally)
- No styling, label, or selection logic changes

