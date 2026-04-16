

# Align Bottom Action Bar Padding with Sidebar

## Change — `src/pages/dashboard/Schedule.tsx` (line 960)

Reduce the bottom padding of the action bar container from `pb-4` (16px) to `pb-3` (12px) to match the sidebar's `bottom-3` spacing.

**Current:**
```
<div className="shrink-0 px-4 pr-20 pb-4 pt-1">
```

**New:**
```
<div className="shrink-0 px-4 pr-20 pb-3 pt-1">
```

Single class change, one line, one file.

