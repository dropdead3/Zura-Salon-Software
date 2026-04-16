

# Scheduler Zoom In/Out — Controls in Action Bar

## Overview
Add zoom controls (ZoomIn / ZoomOut) directly into the ScheduleActionBar, and pipe zoom level through to DayView to dynamically scale row heights and card content thresholds.

## Architecture

```text
Schedule.tsx (owns zoomLevel state)
  ├─ ScheduleActionBar (renders zoom +/- buttons, calls onZoomIn/onZoomOut)
  └─ DayView (receives zoomLevel prop, computes ROW_HEIGHT dynamically)
       └─ DroppableSlot (receives dynamic height via style prop)
       └─ AppointmentCardContent (getCardSize receives zoomLevel for threshold shift)
```

Three zoom levels: 0 (default 20px), 1 (30px), 2 (40px) per 15-min slot.

## Changes

### 1. `src/pages/dashboard/Schedule.tsx`
- Add `const [zoomLevel, setZoomLevel] = useState(0)` state
- Pass `zoomLevel`, `onZoomIn`, `onZoomOut` props to `ScheduleActionBar`
- Pass `zoomLevel` prop to `DayView`

### 2. `src/components/dashboard/schedule/ScheduleActionBar.tsx`
- Add `zoomLevel`, `onZoomIn`, `onZoomOut` to props
- Add a small zoom control group between the Appointments & Transactions link and the Schedule Legend (right side of the bar)
- Two icon buttons: `ZoomOut` (disabled at level 0) and `ZoomIn` (disabled at level 2), using `h-7 w-7 rounded-full` styling consistent with the bar aesthetic
- Separated by a thin `border-l border-border` divider from adjacent elements

### 3. `src/components/dashboard/schedule/DayView.tsx`
- Add `zoomLevel?: number` to `DayViewProps`
- Replace `const ROW_HEIGHT = 20` with `const ROW_HEIGHT = [20, 30, 40][zoomLevel ?? 0]`
- Replace `h-5` in `DroppableSlot` with `style={{ height: rowHeight }}` passed as a prop
- Replace `h-[20px]` in time label slots with dynamic `style={{ height: ROW_HEIGHT }}`
- Pass `zoomLevel` to `getCardSize` calls

### 4. `src/components/dashboard/schedule/AppointmentCardContent.tsx`
- Update `getCardSize(startTime, endTime, zoomLevel = 0)` signature
- Shift thresholds based on zoom:
  - Level 0: compact ≤30, medium ≤59, full 60+
  - Level 1: compact ≤15, medium ≤30, full 31+
  - Level 2: compact ≤0 (never), medium ≤15, full 16+

## Files Modified
- `src/pages/dashboard/Schedule.tsx` — zoom state
- `src/components/dashboard/schedule/ScheduleActionBar.tsx` — zoom buttons UI
- `src/components/dashboard/schedule/DayView.tsx` — dynamic row height
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — zoom-aware card sizing

