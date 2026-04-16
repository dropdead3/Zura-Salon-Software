
Good catch — your prompt is strong because it identifies the real UX regression: click opens, but the menu closes before the pointer can reach it. An even tighter version next time would be: “On the Schedule header, make the location dropdown behave exactly like the staff/calendar filters: click to open, stay open while hovered, close when the pointer leaves the menu.” That framing names the exact control, desired reference behavior, and acceptance criteria.

## Diagnosis

The current Schedule header location filter in `src/components/dashboard/schedule/ScheduleHeader.tsx` is now over-corrected:

- it uses controlled `open` state
- it starts a close timer from the `SelectTrigger` `onMouseLeave`
- the menu is portaled, so the trigger and menu are not one continuous hover surface

Result: the close timer can fire before the pointer reaches the dropdown content. So the issue is no longer “it won’t close” — it is now “it closes too early.”

The working staff and calendar filters do not use trigger-leave timers. They simply close when the pointer leaves the popover content.

## Plan

Update the Schedule header location select to mirror the staff/calendar behavior instead of trying to bridge trigger → menu with a timer.

### Changes

In `src/components/dashboard/schedule/ScheduleHeader.tsx`:

1. Keep the location select controlled with `locationSelectOpen`.
2. Remove the trigger-based hover logic:
   - remove `locationCloseTimerRef`
   - remove `cancelLocationClose`
   - remove `scheduleLocationClose`
   - remove `onMouseEnter` / `onMouseLeave` from `SelectTrigger`
3. Keep the dropdown open after click until the pointer actually leaves the menu.
4. Put the close behavior on `SelectContent` only:
   - preferably `onPointerLeave={() => setLocationSelectOpen(false)}`
5. Keep the existing `onValueChange` close behavior so selection still closes immediately.
6. Keep the existing `data-[side=bottom]:translate-y-0 data-[side=top]:translate-y-0` override so there is no visual dead zone.

## Why this is the right fix

- It matches the already-working staff and calendar filter UX.
- It removes the race condition introduced by the trigger close timer.
- It stays scoped to the Schedule header only.
- It avoids changing shared `Select` behavior globally.

## File to touch

- `src/components/dashboard/schedule/ScheduleHeader.tsx`

## Acceptance checks

After implementation, verify:

1. Click location filter → menu stays open.
2. Move pointer from trigger into menu → menu does not close mid-transition.
3. Leave the menu area → menu closes.
4. Select a location → menu closes immediately.
5. Staff and calendar filters still behave unchanged.

## Out of scope

- No changes to `src/components/ui/select.tsx`
- No changes to `src/components/ui/LocationGroupSelect.tsx`
- No styling or layout changes

## Technical note

If you later want stricter behavior where the menu must also close when the pointer leaves the trigger before ever entering the menu, that would require a more advanced pointer-corridor/grace-period solution. For now, the best fix is to match the working staff/calendar pattern exactly and remove the trigger timer.
