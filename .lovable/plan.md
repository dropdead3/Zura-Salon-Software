

## Enlarge Expected Revenue Badge on Sales Overview

### Problem
The "Expected" revenue badge (clock icon + amount + "Expected" label) is too small — hard to read at a glance on the sales overview card.

### Solution
Increase the badge size across all instances in `AggregateSalesCard.tsx`:

- **Badge text**: `text-xs` → `text-sm`
- **Badge padding**: add `px-3 py-1.5` for more breathing room
- **Clock icon**: `w-3 h-3` → `w-4 h-4`
- **Info icon** next to it: `w-3.5 h-3.5` → `w-4 h-4`

### File modified
**`src/components/dashboard/AggregateSalesCard.tsx`** — all expected revenue badge instances (today, past range, todayToEom)

