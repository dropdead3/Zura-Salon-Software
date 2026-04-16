

# Scheduler Zoom Analysis — Bugs, Errors & Enhancements

## Bugs Found

### 1. Border logic doesn't adapt to zoom interval (DroppableSlot, line 139-145)
The `borderClass` in DroppableSlot is hardcoded for 15/30/60-min marks:
```ts
minute === 0 → solid border
minute === 30 → dashed border
minute % 15 === 0 → dotted border
else → no border
```
**Problem**: At 20-min intervals (level 0), slots are at :00, :20, :40. The :20 and :40 marks hit the `else` branch → **no border at all**. At 10-min intervals (level 2), slots like :10, :50 also get no border. At 5-min intervals (level 3), most slots get no border. Only levels -3, -2, -1, and 1 work correctly.

**Fix**: Make border logic interval-aware. Every slot gets a border. Solid at hour marks, dashed at half-hour, dotted for all others.

### 2. `getCardSize` doesn't handle zoom levels -3 to -1 or level 3 (AppointmentCardContent.tsx, line 669-685)
The function only has branches for levels 0, 1, and 2. Levels -3 through -1 fall through to the default (level 0) logic, and level 3 (5-min intervals) is completely missing. At level 3, even a 10-min appointment spans 2 rows × 20px = 40px, which should render as `medium` or `full`, but gets `compact` because 10 ≤ 30.

**Fix**: Add cases for levels -3 to -1 (force `compact` since rows are small and appointments span many slots) and level 3 (aggressive thresholds since pixel height per minute is very large).

### 3. `hoursEnd` override for negative zoom is exclusive, potentially clipping midnight appointments (Schedule.tsx, line 794)
```ts
hoursEnd={zoomLevel < 0 ? 24 : preferences.hours_end}
```
If `preferences.hours_end` is set to e.g. 21 (9 PM), zooming out shows 6-24. But zooming back to level 0+ snaps the range back, potentially hiding late appointments that were visible. This isn't a crash bug but a UX inconsistency.

## Enhancement Opportunities

### 4. No zoom level indicator
Users have no visual feedback showing which of the 7 zoom levels they're at. Phorest shows the current interval. Add a small label between the zoom buttons (e.g., "20m" or "1hr").

### 5. Auto-scroll position resets on zoom change
The `useEffect` on line 394 re-scrolls to opening time whenever `slotInterval` or `ROW_HEIGHT` changes. When a user zooms while looking at 3 PM, they jump back to the opening hour. Should preserve the current viewport center time across zoom changes.

### 6. WeekView also receives zoomLevel but may not use the same ZOOM_CONFIG
The WeekView component at line 818-837 receives `zoomLevel` and uses the same `hoursStart`/`hoursEnd` overrides, but its internal row height handling may not match DayView. This should be audited for consistency.

---

## Proposed Changes

### File 1: `src/components/dashboard/schedule/DayView.tsx`

**Border logic fix** (DroppableSlot, lines 139-145):
Replace hardcoded border logic with interval-aware logic that receives `slotInterval` as a prop:
```ts
const borderClass = minute === 0
  ? 'border-t border-border dark:border-border/50'
  : minute === 30 && slotInterval <= 30
    ? 'border-t border-dashed border-border dark:border-border/35'
    : 'border-t border-dotted border-border/60 dark:border-border/15';
```
Pass `slotInterval` to DroppableSlot.

**Scroll preservation** (lines 394-408):
Store the current center time before zoom changes, and scroll to that time after zoom changes instead of always jumping to opening hour. Only scroll to opening hour on initial mount or date change.

### File 2: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

**getCardSize fix** (lines 669-685):
Add missing zoom level branches:
```ts
// Level 3 (5-min): huge pixel density
if (zoomLevel === 3) {
  if (duration <= 5) return 'compact';
  if (duration <= 15) return 'medium';
  return 'full';
}
// Negative levels: compressed rows, force compact for short, medium threshold raised
if (zoomLevel < 0) {
  if (duration <= 45) return 'compact';
  if (duration <= 90) return 'medium';
  return 'full';
}
```

### File 3: `src/components/dashboard/schedule/ScheduleActionBar.tsx`

**Zoom level indicator** (between zoom buttons, ~line 153):
Add a small text label showing the current interval:
```tsx
<span className="text-[10px] text-muted-foreground font-sans min-w-[28px] text-center">
  {zoomConfig.label}
</span>
```
Derive label from zoom level: `{ '-3': '1hr', '-2': '1hr', '-1': '30m', '0': '20m', '1': '15m', '2': '10m', '3': '5m' }`.

### Files Modified
1. `src/components/dashboard/schedule/DayView.tsx` — border logic + scroll preservation
2. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — missing zoom level branches
3. `src/components/dashboard/schedule/ScheduleActionBar.tsx` — zoom level indicator label

