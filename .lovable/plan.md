
## Diagnosis

In `src/components/ui/calendar.tsx`, the `day_today` class is `bg-accent text-accent-foreground [...]` with no border-radius. The day buttons themselves are square (h-9 w-9), so the accent background renders as a sharp square behind today's number.

The selected state appears as a circle because `day_selected` uses `bg-primary` and the underlying button (via `buttonVariants({ variant: "ghost" })`) presumably picks up rounding — but `day_today` is overriding to a flat square.

## Fix

Single line in `src/components/ui/calendar.tsx`. Add `rounded-md` (matches the rest of the calendar's radius vocabulary — see `cell` class which uses `rounded-r-md` / `rounded-l-md`) to `day_today`:

```tsx
day_today: "rounded-md bg-accent text-accent-foreground [&[aria-selected=true]]:bg-transparent [&[aria-selected=true]]:text-primary-foreground",
```

Using `rounded-md` (6px) keeps it visually distinct from the fully-circular `day_selected` (which appears round because the button is square + ghost variant rounds it). If user wants fully circular today, swap to `rounded-full` — but `rounded-md` is the calmer, more calendar-native choice and matches the existing radius system.

## Acceptance checks

1. Today (when not selected) renders with softly rounded corners, not a sharp square.
2. Today + selected: still shows only the purple selected indicator (transparent override preserved).
3. No regression to other day states.

## File touched

- `src/components/ui/calendar.tsx` — add `rounded-md` to `day_today` className.
