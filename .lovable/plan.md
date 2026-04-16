

# Sync Zoom Level Between Day View and Week View

## Problem
WeekView is hardcoded to 15-minute intervals with a fixed 20px row height and ignores the `zoomLevel` prop entirely. When toggling between Day and Week views, the zoom level doesn't carry over — Week always shows the same density regardless of what zoom level the user selected.

## Solution
Apply the same ZOOM_CONFIG and dynamic row height logic from DayView to WeekView, and pass the `zoomLevel` prop + adjusted `hoursStart`/`hoursEnd` from Schedule.tsx.

## Changes

### 1. `src/pages/dashboard/Schedule.tsx` (~lines 840-858)
Pass `zoomLevel` and zoom-adjusted `hoursStart`/`hoursEnd` to WeekView (same as DayView already receives):
```tsx
<WeekView
  currentDate={currentDate}
  appointments={appointments}
  hoursStart={zoomLevel <= -3 ? 6 : zoomLevel === -2 ? 6 : zoomLevel === -1 ? 7 : preferences.hours_start}
  hoursEnd={zoomLevel <= -3 ? 24 : zoomLevel === -2 ? 22 : zoomLevel === -1 ? 21 : preferences.hours_end}
  zoomLevel={zoomLevel}
  // ...rest unchanged
/>
```

### 2. `src/components/dashboard/schedule/WeekView.tsx`
**Interface** — add `zoomLevel?: number` prop.

**Replace hardcoded constants** — remove `ROW_HEIGHT = 20` and `SLOTS_PER_HOUR = 4`. Add the same `ZOOM_CONFIG` lookup used in DayView:
```ts
const ZOOM_CONFIG: Record<string, { interval: number }> = {
  '-3': { interval: 60 }, '-2': { interval: 60 }, '-1': { interval: 30 },
  '0': { interval: 20 }, '1': { interval: 15 }, '2': { interval: 10 }, '3': { interval: 5 },
};
const slotInterval = ZOOM_CONFIG[String(zoomLevel)]?.interval ?? 20;
```

**Dynamic row height** — add `ResizeObserver` on `scrollRef` (same pattern as DayView) to calculate `ROW_HEIGHT` dynamically:
```ts
const totalSlots = (hoursEnd - hoursStart) * (60 / slotInterval);
const ROW_HEIGHT = containerHeight > 0
  ? Math.max(20, Math.floor((containerHeight - 56) / totalSlots))
  : 20;
```

**Time slots generation** (~line 239-257) — replace hardcoded `minute += 15` with `minute += slotInterval`. Update label logic to match DayView (hour = full time, others = minute number).

**`getEventStyle`** (~line 56-64) — replace hardcoded `/15` divisions with `/slotInterval`:
```ts
const top = (startOffset / slotInterval) * ROW_HEIGHT;
const height = Math.max((duration / slotInterval) * ROW_HEIGHT, ROW_HEIGHT);
```

**Slot row height** (~lines 365, 416) — replace `h-[20px]` with dynamic `style={{ height: ROW_HEIGHT }}`.

**Current time offset** (~line 279) — replace `/ 15 * ROW_HEIGHT` with `/ slotInterval * ROW_HEIGHT`.

**Border logic** — replace hardcoded `isHour`/`isHalf` border classes with interval-aware borders (same as DayView fix):
```ts
minute === 0 ? 'border-t border-border' 
  : minute === 30 && slotInterval <= 30 ? 'border-t border-dashed border-border'
  : 'border-t border-dotted border-border/60'
```

### Files Modified
1. `src/pages/dashboard/Schedule.tsx` — pass `zoomLevel` and adjusted hours to WeekView
2. `src/components/dashboard/schedule/WeekView.tsx` — accept `zoomLevel`, dynamic intervals, dynamic row height, interval-aware borders and labels

