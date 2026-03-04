

## Fix: Shifts View and Floating Action Bar Off-Screen

### Problem

1. **Shifts View** is rendered inside `calendarContent` (which is placed in an `overflow-hidden` flex container at line 772). Since the shifts card renders below the calendar grid content, it gets clipped and is invisible.

2. **Floating Action Bar** renders at `absolute bottom-0` but competes with the shifts view content. When shifts is toggled on, both elements fight for the same bottom space.

### Solution

**Move the shifts view outside the calendar container** so it replaces the calendar when active, rather than appending below it inside a clipped container.

#### Changes to `src/pages/dashboard/Schedule.tsx`:

1. **Remove** the shifts view from inside `calendarContent` (lines 730-735)
2. **Conditionally render** either the shifts view OR the calendar view in the main content area (line 772):
   - When `showShiftsView` is true: render `ShiftScheduleView` in a scrollable container (no overflow-hidden clipping)
   - When `showShiftsView` is false: render the existing calendar content as-is
3. **Hide the floating action bar** when shifts view is active (it's irrelevant for shift scheduling)

```text
Layout when shifts OFF (current):
┌─────────────────────────┐
│ ScheduleHeader          │
├─────────────────────────┤
│ Calendar (overflow-hidden)│
│ ┌─────────────────────┐ │
│ │ DayView / AgendaView│ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Floating Action Bar     │
└─────────────────────────┘

Layout when shifts ON (fix):
┌─────────────────────────┐
│ ScheduleHeader          │
├─────────────────────────┤
│ ShiftScheduleView       │
│ (scrollable, full area) │
└─────────────────────────┘
```

This is a small, targeted fix — only `Schedule.tsx` needs editing.

