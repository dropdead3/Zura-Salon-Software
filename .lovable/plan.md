
## Diagnosis

In the screenshot, the selected date (21) shows a purple circle on top of a square accent highlight box. The square comes from the cell's `[&:has([aria-selected])]:bg-accent` rule in `src/components/ui/calendar.tsx`:

```tsx
cell: "h-9 w-9 ... [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md ...",
```

This was designed for range-mode pickers (where adjacent selected cells form a continuous bar). For single-mode pickers it adds visual noise behind the circular pill.

## Fix

Single file: `src/components/ui/calendar.tsx`. Strip the cell-level accent background + range-rounding from `cell`, leaving only the layout/focus pieces:

```tsx
cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-outside)]:bg-accent/50 focus-within:relative focus-within:z-20",
```

Then add `rounded-full` to `day_selected` so the selected pill is explicitly circular regardless of the underlying ghost button radius:

```tsx
day_selected: "rounded-full bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
```

`day_range_end` / `day_range_middle` classes stay as-is — if anyone ever uses range mode, they can re-introduce the cell rounding scoped to range mode only. For now the only consumer is the single-date schedule picker.

## Acceptance checks

1. Selected date: clean purple circle, no square highlight behind it.
2. Today (not selected): rounded-lg accent square unchanged.
3. Today + selected: only the purple circle renders (existing transparent override holds).
4. Outside-month selected days: still get the muted accent treatment (preserved via `day-outside` rule).
5. No regression to hover/focus states.

## File touched

- `src/components/ui/calendar.tsx` — remove cell-level `bg-accent` + range rounding; add `rounded-full` to `day_selected`.
