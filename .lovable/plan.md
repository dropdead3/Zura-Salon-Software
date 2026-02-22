

# Fix Confirmation Badge Overlapping Assistant Badge

## Problem

The top-right indicators cluster (status badge, icons) at `top-1 right-1 z-20` overlaps with the assistant avatar badges at `top-0.5 right-0.5 z-10` because both are absolutely positioned in the same corner.

## Solution

Stack the assistant avatars below the indicators cluster instead of competing for the same spot. Move the assistant badges from `top-0.5 right-0.5` to sit just below the indicator row by changing their position to `top-5 right-1`. This gives the status/indicator row clear ownership of the top-right corner, with assistant avatars neatly tucked underneath.

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

**Line 351** -- Change the assistant badges container position:

Before:
```tsx
<div className="absolute top-0.5 right-0.5 z-10 flex items-center -space-x-1">
```

After:
```tsx
<div className="absolute top-5 right-1 z-10 flex items-center -space-x-1">
```

This positions the assistant avatars roughly 20px from the top, clearing the indicator/status badge row above them.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Move assistant avatar cluster from `top-0.5 right-0.5` to `top-5 right-1` to sit below the status indicator row |
