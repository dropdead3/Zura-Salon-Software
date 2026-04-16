

# Ghost-Style Today Button in Dark Mode

## Change — `src/components/dashboard/schedule/ScheduleHeader.tsx` (line 425)

Update the active state class for the Today button to use a ghost style in dark mode while keeping the solid primary fill in light mode.

**Current (line 425):**
```
'bg-primary text-primary-foreground shadow-sm'
```

**New:**
```
'bg-primary text-primary-foreground shadow-sm dark:bg-primary/15 dark:text-primary dark:shadow-none'
```

This gives the button a subtle translucent primary tint with primary-colored text in dark mode — matching the ghost convention shown in the screenshot — while preserving the solid purple in light mode.

Single line change, one file.

