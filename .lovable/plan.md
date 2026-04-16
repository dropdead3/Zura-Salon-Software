

# Alphabetical Stylist Order + Level Labels

## Changes

### 1. Sort columns alphabetically in `DayView.tsx`
**Line 516-523** — Change `sortedStylists` from utilization-based sort to alphabetical by display name:
```tsx
const sortedStylists = useMemo(() => {
  return [...stylists].sort((a, b) => {
    const aName = formatDisplayName(a.full_name, a.display_name);
    const bName = formatDisplayName(b.full_name, b.display_name);
    return aName.localeCompare(bName);
  });
}, [stylists]);
```

### 2. Sort dropdown list alphabetically in `ScheduleHeader.tsx`
**Line 377** — Sort the `stylists` array before mapping in the filter dropdown:
```tsx
{[...stylists].sort((a, b) => 
  formatFullDisplayName(a.full_name, a.display_name)
    .localeCompare(formatFullDisplayName(b.full_name, b.display_name))
).map((s) => (
```

### 3. Level number already visible
The `shortLabel` (`L1`, `L2`, etc.) is already rendered in both condensed and normal header modes. No change needed there.

### Files Modified
1. `src/components/dashboard/schedule/DayView.tsx` — alphabetical sort
2. `src/components/dashboard/schedule/ScheduleHeader.tsx` — alphabetical dropdown order

