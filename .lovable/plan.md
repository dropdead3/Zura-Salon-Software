

# Reduce Radius & Add Ghost Stroke on Today Button (Dark Mode)

## Change — `src/components/dashboard/schedule/ScheduleHeader.tsx` (line 423-425)

**Line 423** — Reduce radius from `rounded-xl` to `rounded-lg`:
```
rounded-xl → rounded-lg
```

**Line 425** — Add a bright ghost-style border in dark mode:
```
Current:
'bg-primary text-primary-foreground shadow-sm dark:bg-primary/15 dark:text-primary dark:shadow-none'

New:
'bg-primary text-primary-foreground shadow-sm dark:bg-primary/15 dark:text-primary dark:shadow-none dark:border dark:border-primary/40'
```

This gives the active Today button a smaller corner radius and a translucent primary-colored stroke in dark mode, reinforcing the ghost-button aesthetic shown in the screenshot.

Two lines changed, one file.

