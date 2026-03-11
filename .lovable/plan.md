

## Remove Right-Click Context Menu from Schedule Grid

The right-click context menu ("Add Break / Block" and "Request Assistant") is no longer needed since these options are now available through the ScheduleTypeSelector dialog on left-click.

### Changes

**1. `src/pages/dashboard/Schedule.tsx`**
- Remove `breakContextMenu` state and `handleSlotContextMenu` function (~lines 194-230)
- Remove the `onSlotContextMenu` prop from both `DayView` renders (~lines 649, 676)
- Remove the fixed-position context menu JSX block (~lines 978-1010)
- Remove the click-outside listener for the context menu

**2. `src/components/dashboard/schedule/DayView.tsx`**
- Remove `onSlotContextMenu` from props interface (line 45)
- Remove `onContextMenu` from `TimeSlot` props and its handler (lines 109, 120, 154-159)
- Remove the `onContextMenu` pass-through in the grid render (lines 565-567)

Two files, removal-only changes.

