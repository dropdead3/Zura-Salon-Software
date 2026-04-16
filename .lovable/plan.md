

# Enhanced Zoom: Variable Time Intervals + Extended Range

## Overview
Expand the zoom system from 3 levels to 5 levels. Zoom out compresses the grid to 5-min slots with a 6am–midnight range, while zoom in expands slots for detail. The slot interval (minutes per row) becomes variable instead of hardcoded at 15.

## Zoom Level Definitions

| Level | Slot Interval | Row Height | Hours Range | Description |
|-------|--------------|------------|-------------|-------------|
| -2 | 5 min | 4px | 6:00–24:00 | Maximum zoom out — full day overview |
| -1 | 10 min | 8px | 6:00–24:00 | Condensed overview |
| 0 | 15 min | 20px | preferences | Default (current) |
| 1 | 15 min | 30px | preferences | Zoom in |
| 2 | 15 min | 40px | preferences | Maximum zoom in |

## Architecture

```text
Schedule.tsx (owns zoomLevel state, now -2 to +2)
  ├─ ScheduleActionBar (buttons, updated min/max)
  └─ DayView (receives zoomLevel, computes slotInterval + rowHeight + hour range)
       ├─ getEventStyle() — uses slotInterval instead of hardcoded 15
       ├─ timeSlots generation — uses slotInterval for minute steps
       ├─ DroppableSlot borders — adjusted for variable intervals
       ├─ currentTimeOffset — uses slotInterval
       └─ AppointmentCardContent (getCardSize receives zoomLevel)
```

## Changes

### 1. `src/pages/dashboard/Schedule.tsx`
- Change `zoomLevel` initial state to `0`, range from `-2` to `2`
- Update `onZoomIn` max to `2`, `onZoomOut` min to `-2`
- For zoom levels -2 and -1, override `hoursStart=6` and `hoursEnd=24` passed to DayView

### 2. `src/components/dashboard/schedule/ScheduleActionBar.tsx`
- Update disabled conditions: `zoomLevel <= -2` for zoom out, `zoomLevel >= 2` for zoom in

### 3. `src/components/dashboard/schedule/DayView.tsx`
- Add zoom config lookup:
  ```
  const ZOOM_CONFIG = {
    '-2': { interval: 5, rowHeight: 4 },
    '-1': { interval: 10, rowHeight: 8 },
    '0': { interval: 15, rowHeight: 20 },
    '1': { interval: 15, rowHeight: 30 },
    '2': { interval: 15, rowHeight: 40 },
  }
  ```
- Replace all `/ 15 * ROW_HEIGHT` math with `/ slotInterval * rowHeight`
- `getEventStyle()` — accept `slotInterval` param, use it instead of hardcoded `15`
- `timeSlots` generation — use `slotInterval` for minute step instead of `15`
- `DroppableSlot` border logic — adjust for variable intervals (solid at hour, dashed at 30, dotted at 15, no border at 5/10)
- Time labels — only show labels at hour marks and 30-min marks regardless of interval
- `currentTimeOffset` — use `slotInterval` in calculation
- Auto-scroll offset — use `60 / slotInterval` instead of hardcoded `4` for slots-per-hour

### 4. `src/components/dashboard/schedule/AppointmentCardContent.tsx`
- Keep existing zoom-aware thresholds; levels -2 and -1 use same thresholds as level 0 (compact for short appointments since rows are tiny)

## Files Modified
- `src/pages/dashboard/Schedule.tsx` — zoom range + hour overrides
- `src/components/dashboard/schedule/ScheduleActionBar.tsx` — button bounds
- `src/components/dashboard/schedule/DayView.tsx` — variable interval math, time slot generation, border logic
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — no change needed (level 0 thresholds work for negative zoom)

