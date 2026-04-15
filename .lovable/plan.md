

## Restack Date Display in Schedule Header

### Change
Update the centered date display in the dark header bar to stack vertically:
- **Top line**: Day name (e.g., "Tuesday") — smaller, muted color
- **Bottom line**: Month Day, Year (e.g., "April 14, 2026") — larger, primary color

### Scope
- **1 file**: `src/components/dashboard/schedule/ScheduleHeader.tsx`
- **~8 lines changed** (lines 225-232)

### Implementation
Replace the single-line date format with a two-line stack:
```tsx
<div className="text-center">
  <div className="text-xs font-display tracking-wide text-[hsl(40,20%,92%)]/70">
    {formatDate(currentDate, 'EEEE')}
  </div>
  <div className="text-sm font-display tracking-wide whitespace-nowrap">
    {formatDate(currentDate, 'MMMM d, yyyy')}
  </div>
</div>
```

Removes the conditional "Today" label since the day name is now always visible on the top line.

