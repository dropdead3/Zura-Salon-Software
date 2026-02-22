
# Remove Drag Handle Icon from Appointment Cards

## What Changes
Remove the 6-dot GripVertical icon that appears on hover in the top-right area of appointment cards in DayView. WeekView does not have this icon, so no changes needed there.

## Technical Details

### DayView.tsx
- Delete lines 389-394 (the drag handle indicator block)
- Remove `GripVertical` from the lucide-react import on line 14 (if no longer used elsewhere in the file)

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Remove GripVertical icon block (lines 389-394) and clean up unused import |

No other files affected. No database or dependency changes.
