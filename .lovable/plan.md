
## Prompt review

Clear bug report with reproducible behavior. Tighter version: "Centered date pill opens calendar but it closes immediately on click — keep it open until a date is selected or user clicks outside." Teaching note: pairing the symptom ("doesn't stay open") with desired behavior ("stays open when clicked") in one sentence is exactly right — saves a clarification round.

## Diagnosis

In `ScheduleHeader.tsx`, **two `Popover` components are bound to the same `datePickerOpen` state**:

- L193: First Popover — `<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>` wrapping the small "Date" pill button (visible at ≥1320px)
- L230: Second Popover — same `open`/`onOpenChange` bindings, wrapping the centered date display button

When state flips to `true`, **both popovers render their `PopoverContent` in separate portals**. Radix UI's outside-click detection on each portal sees the *other* portal's content as "outside the popover" → fires `onOpenChange(false)` → calendar closes instantly.

Plus there's a layout mirror bug: the L193 popover anchors to its (hidden) trigger, but the calendar would render at the wrong position even if it stayed open.

Also at L229, the wrapper has `@md/schedhdr:pointer-events-none` to let the absolute-centered date not block clicks behind it. The button has `pointer-events-auto` to remain clickable. That's fine — but `PopoverContent` renders in a portal, so portal pointer events are unaffected. Not the cause, but worth noting it's correct.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`.

**Remove the duplicate Popover at L193–225 entirely.** The centered date pill at L230–265 is the only date trigger we need. The small ghost-pill "Date" button was a leftover from the earlier left-cluster layout and was already redundant once the centered pill was introduced.

### Implementation
1. Delete L191–226 (the entire "Date group" wrapper containing the duplicate Popover + small Date pill button + its PopoverContent)
2. Keep L228–266 (centered date Popover) untouched — this is the canonical date picker

### Why this fixes it
- Only one Popover bound to `datePickerOpen` → no portal-vs-portal outside-click conflict
- Calendar stays open until user picks a date (`setDatePickerOpen(false)` in `onSelect`) or clicks truly outside
- Removes dead UI (the small "Date" pill served no purpose once date moved to center)

## Acceptance checks

1. Click centered date pill → calendar opens and stays open.
2. Pick a date → calendar closes, header date updates.
3. Click outside calendar → calendar closes.
4. No duplicate "Date" ghost pill renders anywhere at any viewport width.
5. Centered date stays centered (no layout shift from removed sibling).

## Out of scope

- Day/Week toggle, Shifts pill, selectors, bottom action bar — unchanged.
- Calendar styling — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — delete lines 191–226 (duplicate date Popover and its wrapper).
