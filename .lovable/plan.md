

# Restore Booking Label + Relocate Lead Pool Icon to Top-Right

## Changes in `src/components/dashboard/schedule/DayView.tsx`

### 1. Top-right corner: dot + "Booking" label + Lead Pool icon
Move the booking indicator and lead pool icon together into the top-right absolute container:
- Green/red dot + "Booking" / "Not Booking" text label (text-[10px])
- Lead Pool `UserPlus` icon next to it, using `text-purple-400` for better visibility against the dark sidebar background
- All wrapped in a single `absolute top-1.5 right-1.5 flex items-center gap-1.5` container

### 2. Clean up second row
Remove the `UserPlus` icon from the utilization row (line 545-552) since it moves to the top-right. The second row will only show the utilization percentage.

### Result per cell
```text
┌──────────────────── ● Booking 👤+┐
│ [Avatar]  Trinity Graves  L2     │
│           72%                    │
└──────────────────────────────────┘
```

Single file change, no new dependencies.

