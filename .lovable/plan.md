

## Fix Goal Tracker Status Badge Font — Add `font-sans`

### Problem
The pace status badge ("Ahead", "On Track", "Behind") on `GoalTrackerCard.tsx` is still rendering in Termina because it lacks an explicit `font-sans` class.

### Solution
Add `font-sans` to the badge `<span>` class string at line 151 of `GoalTrackerCard.tsx`.

### File modified
**`src/components/dashboard/sales/GoalTrackerCard.tsx`** — line 151: add `font-sans` to the `cn(...)` call on the pace status badge.

