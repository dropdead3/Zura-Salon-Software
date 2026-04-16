
## Diagnosis

In `src/components/ui/calendar.tsx`, today's date currently has `rounded-md` (6px). The screenshot shows it still reads as a sharp-cornered square because `rounded-md` is too subtle against the 36px (`h-9 w-9`) cell. The selected-date pill elsewhere in the app reads as fully circular because the underlying ghost button rounds it more aggressively.

To match the calm, pill-like aesthetic of the selected state and make the radius visually obvious at this size, bump to `rounded-lg` (8px) — or `rounded-xl` if you want even softer. Going with `rounded-lg` as the right balance: clearly rounded, still distinct from the fully-circular selected indicator, consistent with the bento card radius vocabulary used elsewhere.

## Fix

Single token change in `src/components/ui/calendar.tsx`:

```tsx
day_today: "rounded-lg bg-accent text-accent-foreground [&[aria-selected=true]]:bg-transparent [&[aria-selected=true]]:text-primary-foreground",
```

## Acceptance checks

1. Today's purple highlight renders with visibly soft, rounded corners (8px).
2. Today + selected: still shows only the selected indicator (transparent override preserved).
3. No other day states regressed.

## File touched

- `src/components/ui/calendar.tsx` — change `rounded-md` to `rounded-lg` on `day_today`.
