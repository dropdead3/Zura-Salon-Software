

# Appointment Card Hover: Background Tint Shift

## What Changes

Replace the current magnify + shadow hover effect with a calm background tint shift. On hover, the card's background will subtly lighten (light mode) or brighten (dark mode) without any scale, shadow, or border changes.

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

**Line 296** -- Replace the current hover classes:

**Before:**
```
hover:shadow-md hover:z-20 hover:scale-[1.02]
```

**After:**
```
hover:brightness-110 dark:hover:brightness-125 hover:z-20
```

This uses the CSS `filter: brightness()` utility to subtly lift the card's appearance on hover. No layout shift, no shadow, no scale -- just a gentle tint change. The `hover:z-20` is kept so hovered cards render above neighbors.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Replace hover scale+shadow with brightness shift (line 296) |
