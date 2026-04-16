
## Prompt review

Crisp visual bug report. Tighter version: "Today's cell in the date picker shows both a purple circle (selected) and a square accent (today) — remove the square so only the selected indicator renders." Teaching note: naming both visual layers ("circle" + "square highlight") is exactly what helps me locate the right CSS class — keep that pattern.

## Diagnosis

The Calendar component (`src/components/ui/calendar.tsx`) applies two distinct visual treatments to today's date:

- `day_selected`: `bg-primary text-primary-foreground` → the purple circle (rounded via button shape)
- `day_today`: `bg-accent text-accent-foreground` → the subtle square highlight behind it

When today is also the selected date, both classes apply → square accent peeks behind the circle.

Per project doctrine, the selected state should be the sole indicator when they coincide. Today's distinct accent should remain when today is *not* selected (e.g., user navigates to a different date — today still gets a visual marker).

## Fix

Single file: `src/components/ui/calendar.tsx`.

Modify `day_today` class to remove the visible square accent. Two options:

**Option A**: Remove `day_today` background entirely → today gets no visual marker ever.
**Option B**: Keep `day_today` accent only when *not* selected → use `aria-selected:bg-transparent` or similar to suppress when overlapping selection.

Going with **Option B** — preserves "today" affordance when user navigates to other dates (standard date-picker UX), only suppresses the square when redundant with selection.

### Implementation

Change:
```tsx
day_today: "bg-accent text-accent-foreground",
```

To:
```tsx
day_today: "bg-accent text-accent-foreground [&[aria-selected=true]]:bg-transparent [&[aria-selected=true]]:text-primary-foreground",
```

This keeps the today indicator for unselected today, but transparent background when today is also selected (so only the purple circle shows).

## Acceptance checks

1. Today + selected (default state): only purple circle visible, no square behind it.
2. Navigate to a different month/date: today still shows subtle accent square (preserves orientation).
3. Other selected dates: render purple circle as before.
4. No regression in any other consumer of `Calendar` (date pickers across the app share this component).

## Out of scope

- Day/Week toggle, Shifts pill, header layout — unchanged.
- Calendar typography, spacing, navigation chevrons — unchanged.

## File touched

- `src/components/ui/calendar.tsx` — adjust `day_today` className to suppress accent when also selected.
