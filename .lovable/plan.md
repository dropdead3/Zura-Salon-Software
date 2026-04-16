

# Sort Locations Alphabetically in Schedule Header Dropdown

## Change
In `ScheduleHeader.tsx` line 314, sort the `locations` array alphabetically by name before mapping:

```tsx
{[...locations].sort((a, b) => a.name.localeCompare(b.name)).map((loc) => {
```

### Files Modified
1. `src/components/dashboard/schedule/ScheduleHeader.tsx` — alphabetical sort on location dropdown

