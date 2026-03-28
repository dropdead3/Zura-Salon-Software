

## Fix Goal Tracker Status Badges — Use Aeonik Pro Instead of Termina

### Problem
The status badges ("Ahead", "Behind", "On Track", etc.) on the Goal Tracker card are rendering in Termina (uppercase) instead of Aeonik Pro. Per typography doctrine, these are UI labels and must use `font-sans`.

### Solution
Add explicit `font-sans` class to the status badge `<span>` elements in both goal card components to ensure they render in Aeonik Pro.

### Files modified

1. **`src/components/dashboard/goals/GoalCardWithData.tsx`** — line 181: add `font-sans` to the status badge class string
2. **`src/components/dashboard/goals/GoalCard.tsx`** — line ~121: add `font-sans` to the equivalent status badge class string

Both changes are identical: inserting `font-sans` into the existing `cn(...)` class list on the status badge span.

