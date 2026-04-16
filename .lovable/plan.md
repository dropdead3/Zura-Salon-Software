

# Scheduler Analysis: Gaps, Bugs & Enhancements

## Bugs

### 1. Double-Booked Appointment Gap (Still Present)
The overlap layout math in `DayView.tsx` (lines 289-290) still produces a 2px center gap between adjacent overlapping cards. The previous fix reduced it from 4px to 2px but didn't eliminate it. Inner cards should have zero inset; only outer edges of the overlap group need margin.

Additionally, the right-edge hover behavior (line 292-294) shrinks overlapping cards to 70% width, which creates a huge temporary gap on narrow double-booked columns. This should be gated for `totalOverlapping > 1`.

### 2. WeekView Has No Overlap Handling
`WeekView.tsx` renders all appointments in a day column with fixed `left: '4px'` and `right: '4px'` (line 227-228). When two appointments overlap in time on the same day, they stack directly on top of each other with no side-by-side column logic. This makes one appointment completely invisible. DayView handles this with `getOverlapInfo` — WeekView has no equivalent.

### 3. Zoom Scroll Preservation Uses Stale Refs
In `DayView.tsx` lines 436-445, the zoom scroll-preservation reads `prevSlotIntervalRef.current` and `prevRowHeightRef.current` **after** they've already been updated on lines 433-434. This means the "old" values are actually the new values, making the fraction calculation meaningless. The refs should be read before being updated.

### 4. `getEventStyle` — No Guard on Negative/Zero Duration
If `end_time <= start_time` (bad data or midnight crossing), `duration` goes to 0 or negative. `Math.max` catches the rowHeight floor, but the `top` can be negative if `startTime < hoursStart * 60`. No clamping is applied to `top`.

### 5. Duplicated `parseTimeToMinutes` / `formatTime12h` / `getEventStyle`
These utility functions are copied across DayView, WeekView, AgendaView, AssistantBlockOverlay, MeetingCard, ScheduleActionBar, and AppointmentCardContent. Any fix to one copy doesn't propagate to others.

---

## Gaps

### 6. No Overlap Handling for Meetings vs Appointments
`MeetingGridCard` and `AppointmentCard` both render as `absolute z-10` in the same column. If a meeting and appointment overlap in time, they stack on top of each other. No layout coordination exists between meeting cards and appointment cards.

### 7. No Keyboard Navigation or Accessibility
Appointment cards use `div` with `onClick` — no `role="button"`, no `tabIndex`, no keyboard event handlers. Slots are similarly mouse-only. The drag-and-drop system (`@dnd-kit`) has pointer sensors but no keyboard sensor configured.

### 8. WeekView Missing Drag-and-Drop
DayView implements full `DndContext` with `useDraggable`/`useDroppable` for appointment rescheduling via drag. WeekView has no drag support at all — appointments can only be clicked.

### 9. No Multi-Day Appointment Support
If an appointment crosses midnight (e.g., 23:00 to 01:00), `getEventStyle` computes a negative duration. Neither DayView nor WeekView handles multi-day or midnight-crossing events.

### 10. AgendaView Doesn't Pass `pixelHeight`
The height-awareness feature added to DayView and WeekView was not extended to AgendaView. While AgendaView uses a card layout (not grid), `getCardSize` is called without `pixelHeight`, so the agenda variant falls back to duration-only sizing.

---

## Enhancements

### 11. Consolidate Schedule Utilities into a Shared Module
Extract `parseTimeToMinutes`, `formatTime12h`, `getEventStyle`, `getOverlapInfo` into `src/lib/schedule-utils.ts`. Eliminates 5+ copies and ensures consistent behavior.

### 12. Add Overlap Columns to WeekView
Port the `getOverlapInfo` logic from DayView into WeekView so same-day overlapping appointments render side-by-side instead of stacking.

### 13. Flush Overlap Card Edges
For overlapping appointments, remove internal gutter entirely (only outer edges get 1px inset). Optionally square inner-facing corners (`rounded-l-none` / `rounded-r-none`) so the seam looks truly flush.

### 14. Gate Hover-Shrink for Overlapping Cards
When `totalOverlapping > 1`, disable or reduce the right-edge shrink from 70% to 90% to prevent large gaps when hovering narrow double-booked cards.

### 15. Add Keyboard Sensor to DnD
Add `KeyboardSensor` to the DndContext sensors array so appointment rescheduling works via keyboard for accessibility compliance.

---

## Priority Recommendation

```text
HIGH   — #2 (WeekView overlap stacking — data loss)
HIGH   — #3 (Zoom scroll stale refs — broken UX)
HIGH   — #1 (Double-book gap — visual polish, user-reported)
MEDIUM — #5/#11 (Utility dedup — maintenance risk)
MEDIUM — #12 (WeekView overlap columns)
MEDIUM — #13-14 (Flush edges + hover gate)
LOW    — #4, #6, #7, #8, #9, #10, #15
```

### Files Involved
1. `src/components/dashboard/schedule/DayView.tsx`
2. `src/components/dashboard/schedule/WeekView.tsx`
3. `src/components/dashboard/schedule/AppointmentCardContent.tsx`
4. `src/components/dashboard/schedule/AgendaView.tsx`
5. `src/components/dashboard/schedule/AssistantBlockOverlay.tsx`
6. `src/components/dashboard/schedule/meetings/MeetingCard.tsx`
7. New: `src/lib/schedule-utils.ts` (utility consolidation)

Want me to tackle these in priority order, or focus on a specific subset?

