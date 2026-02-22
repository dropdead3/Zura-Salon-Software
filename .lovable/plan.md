

# Fix: Overlapping Service Labels on Appointment Cards

## Problem

On tall multi-service appointment cards (e.g., 270min Full Balayage + Blowout + Maintenance Cut), service names overlap each other. This happens because:

- Service labels use `position: absolute` with percentage-based `top` offsets inside a container with a tiny `minHeight` (e.g., 42px for 3 services)
- The percentages resolve against this small container, not the full card height, so labels cluster together and overlap

## Fix

Replace the absolute positioning approach with simple stacked (relative) layout for all service label counts. This guarantees no overlap regardless of how many services exist.

### Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx` (lines 531-550)**

Replace the per-service time-slot section. Instead of conditionally using `position: absolute` for 3+ services, always render service labels as a simple vertical list with relative positioning:

```tsx
// Before: absolute positioning causes overlap
{serviceBands.map((band, i) => (
  <div
    style={{
      position: serviceBands.length > 2 ? 'absolute' : 'relative',
      top: serviceBands.length > 2 ? `${offsetPercent}%` : undefined,
    }}
  >

// After: always use relative stacking
{serviceBands.map((band, i) => (
  <div className="text-[10px] opacity-90 truncate">
```

Remove the `minHeight` style and the `offsetPercent` calculation entirely. The service labels will simply stack vertically within the card's natural flow, which the card has plenty of vertical space for on 60min+ appointments.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Simplify service label rendering to use stacked layout instead of absolute positioning (lines 531-550) |

No new files, no database changes, no dependency changes.

