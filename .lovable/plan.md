

# Show Time Increment Labels Like Phorest

## Problem
Currently, time labels only appear at hour marks (e.g., "12 PM") and half-hour marks ("30"). At 5-min or 10-min zoom levels, most rows have no label — making it hard to read the timeline. Phorest shows a label on every single slot: full time at the hour, just the minute number for everything else.

## Solution
Update the `timeSlots` label generation in `DayView.tsx` so every slot gets a label:
- **Hour marks** (minute === 0): Full label like "12 PM" (already works)
- **Sub-hour slots**: Show the minute number as a string (e.g., "5", "10", "15", "25", "30", "45")

## Change

### `src/components/dashboard/schedule/DayView.tsx`

**Line 427** — Replace label logic:
```ts
// Before
const label = isHour ? formatHour(hour) : isHalf ? '30' : '';

// After
const label = isHour ? formatHour(hour) : String(minute);
```

This single-line change makes every time slot display its minute value (matching the Phorest pattern exactly), while hours continue to show the formatted time.

**One line changed, one file.**

