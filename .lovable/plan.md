

## Fix Dock Nav Indicator to Full Round

**Problem:** The indicator `div` uses `absolute inset-0` which inherits the button's wide rectangular shape (`flex-1 h-12`). Even with `rounded-full`, a wide rectangle just gets pill-shaped ends, not a circle.

**Fix in `src/components/dock/DockBottomNav.tsx`:**

Change the indicator from `absolute inset-0` (fills entire button rectangle) to a centered, fixed-size circle that sits behind the icon:

- Remove `inset-0` from the indicator
- Add fixed dimensions: `w-12 h-12` (matches button height)
- Center it: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
- Keep `rounded-full` — now it's a perfect circle

This makes the active background a circular highlight behind the icon rather than a stretched pill across the full button width.

