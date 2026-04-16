

# Scheduler Hotkeys: Arrow Navigation + Letter Jump

## What's changing

Adding keyboard shortcuts to the Schedule page for fast navigation:
- **Left/Right arrows**: Move forward/back 1 day
- **Up/Down arrows**: Cycle through locations
- **Letter keys**: Jump to the first location whose name starts with that letter

## Implementation

### New hook: `src/hooks/useScheduleHotkeys.ts`

A focused hook that accepts `currentDate`, `setCurrentDate`, `selectedLocation`, `setSelectedLocation`, and the `locations` array.

Registers a `keydown` listener that:
1. Skips when focus is inside `INPUT`, `TEXTAREA`, `contentEditable`, or `[role="dialog"]` (same guard as the global shortcuts hook)
2. **ArrowRight** → `setCurrentDate(addDays(currentDate, 1))`
3. **ArrowLeft** → `setCurrentDate(subDays(currentDate, 1))`
4. **ArrowDown** → select next location in the array (wrap to first)
5. **ArrowUp** → select previous location in the array (wrap to last)
6. **Any single letter (a-z)** → find first location whose `name` starts with that letter (case-insensitive), set it as selected. No-op if no match.

All arrow actions call `event.preventDefault()` to avoid page scrolling.

### Wire into Schedule page: `src/pages/dashboard/Schedule.tsx`

Import and call `useScheduleHotkeys({ currentDate, setCurrentDate, selectedLocation, setSelectedLocation, locations })` alongside existing state declarations (~line 222).

No other files change. The global `useKeyboardShortcuts` hook is unaffected — its input/dialog guard already prevents conflicts.

