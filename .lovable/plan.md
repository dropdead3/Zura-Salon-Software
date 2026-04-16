

# Fix Week View Header Opacity

## Problem
The sticky day-header row in the week view uses a semi-transparent background (`hsl(var(--muted) / 0.7)`), so appointment cards bleed through when scrolling — visible in all three screenshots.

## Fix
In `WeekView.tsx` line 391, increase the background opacity from `0.7` to `0.95` (or `1` for fully opaque). This keeps the frosted glass aesthetic while ensuring content beneath is not visible through the header.

```tsx
// Before
background: 'hsl(var(--muted) / 0.7)',

// After
background: 'hsl(var(--muted) / 0.95)',
```

Also bump `z-10` to `z-20` on the sticky wrapper (line 385) to ensure the header reliably sits above all appointment cards.

### Files Modified
1. `src/components/dashboard/schedule/WeekView.tsx` — increase header background opacity and z-index

