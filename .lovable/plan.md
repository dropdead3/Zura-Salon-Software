

# Revised Zoom Levels — 7 Levels Matching Phorest Increments

## Overview
Replace the current 5-level zoom system (-2 to +2) with 7 levels (-3 to +3) that mirror Phorest's time slot progression. The zoomed-out levels compress into hourly increments while zoomed-in levels expand to 5-minute granularity.

## Zoom Level Definitions

| Level | Slot Interval | Row Height | Hours Range | Label |
|-------|--------------|------------|-------------|-------|
| -3 | 60 min | 16px | 6:00–24:00 | 1hr compact (screenshot 7) |
| -2 | 60 min | 30px | 6:00–24:00 | 1hr enlarged (screenshot 6) |
| -1 | 30 min | 20px | 6:00–24:00 | 30min (screenshot 5) |
| 0 | 20 min | 20px | preferences | 20min — default (screenshot 4) |
| 1 | 15 min | 20px | preferences | 15min (screenshot 3) |
| 2 | 10 min | 20px | preferences | 10min (screenshot 2) |
| 3 | 5 min | 20px | preferences | 5min (screenshot 1) |

## Changes

### 1. `src/components/dashboard/schedule/DayView.tsx`
Update `ZOOM_CONFIG` to 7 levels:
```ts
const ZOOM_CONFIG = {
  '-3': { interval: 60, rowHeight: 16 },
  '-2': { interval: 60, rowHeight: 30 },
  '-1': { interval: 30, rowHeight: 20 },
  '0':  { interval: 20, rowHeight: 20 },
  '1':  { interval: 15, rowHeight: 20 },
  '2':  { interval: 10, rowHeight: 20 },
  '3':  { interval: 5, rowHeight: 20 },
};
```
- Border/label logic: solid line + label at hour marks, dashed at 30-min marks (when interval <= 30), dotted/lighter for finer subdivisions
- All existing `slotInterval`-based math remains unchanged (already dynamic)

### 2. `src/pages/dashboard/Schedule.tsx`
- Change zoom bounds: `Math.min(prev + 1, 3)` and `Math.max(prev - 1, -3)`
- Hour override: `zoomLevel < 0 ? 6 : preferences.hours_start` (already correct for negative levels)
- Update `hoursEnd` similarly (already `zoomLevel < 0 ? 24`)

### 3. `src/components/dashboard/schedule/ScheduleActionBar.tsx`
- Update disabled bounds: `zoomLevel <= -3` for zoom out, `zoomLevel >= 3` for zoom in

### 4. `src/components/dashboard/schedule/meetings/MeetingCard.tsx`
- No changes needed (already receives `slotInterval` and `rowHeight` as props)

### 5. `src/components/dashboard/schedule/AssistantBlockOverlay.tsx`
- No changes needed (already uses `slotInterval` prop)

## Files Modified
- `src/components/dashboard/schedule/DayView.tsx` — new 7-level ZOOM_CONFIG + border logic
- `src/pages/dashboard/Schedule.tsx` — zoom bounds -3 to +3
- `src/components/dashboard/schedule/ScheduleActionBar.tsx` — button disabled bounds

