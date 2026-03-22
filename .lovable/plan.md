

## Widen Finish Appt Button

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

Increase the swipe reveal area and button width:

1. **Line 29** — Change `OPEN_OFFSET` from `-96` to `-128` (more slide distance)
2. **Line 35** — Change `trayWidth` from `96` to `128`
3. **Line 88** — Change button width from `w-[80px]` to `w-[112px]`

This widens the green button by ~32px while maintaining the 8px gap between card edge and button. The appointment card will be narrower when swiped open, giving the Finish Appt button more presence.

