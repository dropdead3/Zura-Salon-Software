

# Fix: Block Horizontal Scroll on Scheduler

## Problem
While the min-width constraints were removed, both DayView and WeekView scroll containers still use `overflow-auto`, which permits horizontal scrolling. Need to allow only vertical scrolling.

## Fix — 2 one-line class changes

### DayView.tsx (line 456)
`overflow-auto` → `overflow-y-auto overflow-x-hidden`

### WeekView.tsx (line 225)
`overflow-auto` → `overflow-y-auto overflow-x-hidden`

Vertical scroll (for time slots) is preserved. Horizontal scroll is blocked.

