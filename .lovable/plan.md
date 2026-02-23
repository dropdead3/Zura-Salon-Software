
## Fix: Remove Reverted Hover Effects from Appointment Cards

Two hover behaviors that were previously removed have reappeared on the appointment cards in the scheduler. This plan removes them again.

### Issue 1: Magnify (scale) effect on hover

**File:** `src/components/dashboard/schedule/AppointmentCardContent.tsx` (line 582)

The class `hover:scale-[1.01]` applies a subtle zoom on hover. This will be removed while keeping the other hover classes (`hover:shadow-md hover:z-20`) intact -- the shadow and z-index ensure the card still feels interactive without the magnify effect.

### Issue 2: Hover preview tooltip on appointment cards

**File:** `src/components/dashboard/schedule/AppointmentCardContent.tsx` (lines 435-474, 648-653)

The `HoverPreviewWrapper` wraps cards in a Radix tooltip that shows client details on hover. This wrapper and its usage will be removed.

Additionally, the callers that pass `showHoverPreview` will be cleaned up:

- `src/components/dashboard/schedule/DayView.tsx` (line 263) -- remove `showHoverPreview` prop
- `src/components/dashboard/schedule/WeekView.tsx` (line 119) -- remove `showHoverPreview` prop

### Summary of changes

| File | Change |
|------|--------|
| `AppointmentCardContent.tsx` | Remove `hover:scale-[1.01]` from line 582 |
| `AppointmentCardContent.tsx` | Remove `HoverPreviewWrapper` function (lines 435-474) |
| `AppointmentCardContent.tsx` | Remove `showHoverPreview` from props interface and default |
| `AppointmentCardContent.tsx` | Remove conditional wrapper at lines 648-653, always return `gridContent` directly |
| `DayView.tsx` | Remove `showHoverPreview` prop (line 263) |
| `WeekView.tsx` | Remove `showHoverPreview` prop (line 119) |

The hover behavior will be: shadow elevation + z-index boost only. No scale, no tooltip.
