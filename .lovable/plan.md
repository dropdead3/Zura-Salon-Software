

# Fix Jumpy Hover-Shrink on Appointment Cards

## Problem
The shrink uses `e.currentTarget.getBoundingClientRect().right - 24` to detect the right edge. But when the card shrinks, its `right` boundary moves left, so the mouse position that triggered the shrink is now *outside* the card — the card expands back, the mouse is inside again, it shrinks again, causing a rapid jitter loop.

## Solution
Instead of tracking the card's current `right` edge (which moves), use the card's `left` edge + original full width to define a fixed trigger zone. This way the zone doesn't shift when the card shrinks.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Fix `handleMouseMove` logic
Replace `rect.right - 24` with a calculation based on the card's parent container width and the card's left position. Since we know `widthPercent` and the parent width, we can compute the *original* right edge regardless of current shrink state.

Simpler approach: use `useRef` to store the card's full-width right boundary on first hover (or when not shrunk), and compare against that stable value.

**Simplest fix:** Once `isHoveredRight` is true, keep it true until `onMouseLeave`. The shrink stays locked until the mouse fully exits the card. No jitter possible.

```tsx
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  if (isDragOverlay || isHoveredRight) return; // Once shrunk, stay shrunk
  const rect = e.currentTarget.getBoundingClientRect();
  if (e.clientX > rect.right - 24) {
    setIsHoveredRight(true);
  }
};
```

`onMouseLeave` already resets to false — that's the only exit path.

### 2. Same fix in `WeekView.tsx`
Apply identical early-return pattern to `WeekAppointmentCard`.

## Result
Card shrinks once when hovering the right edge, stays shrunk until the mouse leaves entirely. No jitter, smooth and predictable. Two lines changed per file.

