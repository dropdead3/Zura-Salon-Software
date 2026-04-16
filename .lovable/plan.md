

# Replace AI Copilot FAB Icon with Zura Z in Purple

## Change — `src/components/dashboard/HelpFAB.tsx` (line 71)

Replace the `CalendarClock` icon with the `ZuraZIcon` component (already imported at line 6) and add a purple color.

**Current:**
```tsx
<CalendarClock className="h-6 w-6" />
```

**New:**
```tsx
<ZuraZIcon className="h-6 w-6 text-purple-400" />
```

The `ZuraZIcon` is already imported in this file. The `CalendarClock` import can be removed since it's no longer used here (it was removed from `ScheduleActionBar` previously too — verify if still needed elsewhere before removing).

One class swap, one file.

