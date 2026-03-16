

# Fix Yearly Impact Grid Overlap

## Problem
The three stat columns (revenue/yr, waste saved/yr, hours recovered/yr) use `font-display text-xl` which is Termina with wide tracking. Large dollar values like `$43,055` overflow the `grid-cols-3 gap-2` cells and overlap adjacent columns.

## Fix — BackroomPaywall.tsx (lines 242-261)

1. Reduce the stat font size from `text-xl` to `text-base` (or `text-lg` with a fallback)
2. Add `overflow-hidden text-ellipsis whitespace-nowrap` or simply use a smaller size that fits
3. Increase the gap from `gap-2` to `gap-3`

```diff
- <div className="grid grid-cols-3 gap-2">
+ <div className="grid grid-cols-3 gap-3">
```

For each stat value (lines 244, 250, 256):
```diff
- <p className="font-display text-xl tracking-wide text-emerald-400">
+ <p className="font-display text-base tracking-wide text-emerald-400">
```

This keeps the Termina display font but sizes it to fit three columns within the ~320px calculator width without overlap.

