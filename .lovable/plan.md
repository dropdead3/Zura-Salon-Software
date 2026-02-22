

# Fix: Move Service Labels Below Card Header as a Summary Line

## Problem

The "Full Balayage 270min" label inside the top color band overlaps with the client name, avatar, and status icons because both occupy the same top area of the card.

## Solution

1. **Remove labels from inside the color bands** -- the bands will remain as visual indicators only (background colors showing service segments)
2. **Restore a service summary line below the client info** -- show all services (e.g., "Full Balayage 270min, Blowout 30min, Maintenance Cut 30min") as a single truncated text line in the card's content area, positioned between the client name row and the time row

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

**Change 1 (lines 466-470):** Remove the `span` label from inside each color band div, leaving only the background color fill.

**Change 2 (lines 539-544):** Replace the `null` branch for multi-service cards with a service summary line that lists all services with durations:

```tsx
{duration >= 60 && serviceBands && serviceBands.length > 1 ? (
  <div className="text-xs opacity-90 truncate">
    {serviceBands.map(b => `${b.name} ${b.duration}min`).join(' + ')}
  </div>
) : (
  <div className="text-xs opacity-90 truncate">
    {(duration >= 45 && formatServicesWithDuration(...)) || appointment.service_name}
  </div>
)}
```

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Remove labels from color bands (lines 466-470); render service summary in content area (lines 539-541) |

