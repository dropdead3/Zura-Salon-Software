

# Show "N/A" for Tenure on the Last Level

## Problem
Tenure represents the minimum days at a level before promotion eligibility. The highest level has no promotion target, so Tenure should display "N/A" instead of allowing input or showing a value.

## Solution
Add an `isLastLevelTenure` check in `renderMetricCell` that treats the last level's Tenure cell the same way the base level's promotion cells are already treated — rendering "N/A" in both edit and read-only modes.

### Changes in `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**1. Define the skip condition (around line 592)**
```ts
const isLastLevelTenure = metric.label === 'Tenure' && isLastLevel;
```

**2. Edit mode guard (line 594)**
Add `!isLastLevelTenure` to the edit-mode condition so the input is never shown for the last level's Tenure cell.

**3. Read-only N/A render (after line 668)**
Add a block identical to the base-level skip that renders "N/A" when `isLastLevelTenure` is true.

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — 3 small additions (~6 lines total)

### No database changes.

