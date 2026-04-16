

# Add Per-Stylist Capacity Utilization in Column Headers

## What it does
Adds a small utilization percentage below each stylist's name in the DayView header bar. Shows how much of their available time is booked with actual client appointments.

## Calculation
- **Booked minutes**: Sum of all appointment durations for that stylist on that day, excluding `cancelled`, `no_show`, and `Block`/`Break` categories
- **Available minutes**: `(hoursEnd - hoursStart) * 60` (the visible schedule window)
- **Utilization**: `bookedMinutes / availableMinutes * 100`, capped at 100%

## Changes

### `src/components/dashboard/schedule/DayView.tsx`

1. **Add a `useMemo` hook** that computes a `Map<string, number>` of `stylistId → utilization%` from `appointmentsByStylist`, filtering out Block/Break categories and cancelled/no_show statuses.

2. **Update the stylist header cell** (lines 465-479) to add the utilization percentage below the name:
   - Show as a small text like `72%` with a subtle color indicator (green ≥75%, amber 50-74%, muted <50%)
   - Uses `text-xs text-muted-foreground` styling, fitting naturally next to or below the stylist name
   - Wrapped in the existing flex layout — no structural changes needed

### No new files or dependencies required
All data is already available in the component via `appointments`, `stylists`, `hoursStart`, and `hoursEnd`.

