
## Prompt review

Sharp observation — you spotted a concrete UX gap by interacting with the live UI and described both the symptom ("no indicator") and the desired outcome ("indication of which day is today") clearly. Teaching note: when reporting a styling gap, mentioning the surface name ("the date picker popover in the schedule header") narrows the search instantly. Micro-improvement: you could also specify the indicator style you want ("ring", "dot", "highlighted background") to remove ambiguity — otherwise I have to infer from platform conventions.

## Diagnosis

The shared `Calendar` component (`src/components/ui/calendar.tsx`) defines `day_today` as:

```
rounded-lg bg-accent text-accent-foreground [&[aria-selected=true]]:bg-transparent [&[aria-selected=true]]:text-primary-foreground
```

In the dark schedule popover (per screenshot), `bg-accent` resolves to a near-black tone that is visually indistinguishable from the popover background. Result: today (Apr 16) reads identically to any other unselected day. Compounding factor: when today *is* the selected date, both `day_selected` (rounded-full primary fill) and `day_today` apply — the override `[&[aria-selected=true]]:bg-transparent` strips today's accent, leaving only the selected-pill — which is correct, **but** makes "today" indistinguishable from any other selected day.

So two cases need to be solved:
1. **Today, not selected** — needs a clearly visible indicator.
2. **Today, also selected** — needs a secondary cue beyond the primary pill (since today *is* the selected day in the screenshot, this is the failing case the user sees).

## Fix

Update `day_today` in `src/components/ui/calendar.tsx` to add a **primary-colored ring** as the today indicator. Ring works in both states:

- **Today + not selected**: ring outlines the day, no fill needed → unambiguous.
- **Today + selected**: ring sits *outside* the selected pill (via `ring-offset`) → operator sees both "selected" and "this is today" simultaneously.

Proposed token:

```
day_today: "relative rounded-full ring-2 ring-primary/70 ring-offset-2 ring-offset-background text-foreground font-medium [&[aria-selected=true]]:text-primary-foreground"
```

Notes:
- Drop `bg-accent` (invisible in dark popover).
- Switch shape to `rounded-full` to match the selected-day pill — ring traces the same silhouette in both states.
- `ring-offset-background` ensures clean separation from the selected pill (no visual collision).
- `font-medium` (max allowed weight per typography canon) gives a subtle text emphasis as a secondary cue.
- Preserve the `[&[aria-selected=true]]:text-primary-foreground` so text stays readable on the selected pill.

## Scope guard

This change is in the shared `src/components/ui/calendar.tsx` and will apply to **every** date picker platform-wide. That is correct — "today" should be visually marked across all calendars, not just the schedule header. No surface today depends on today being invisible. If any picker needed a different style, it can override via the `classNames` prop.

## Acceptance checks

1. Open schedule date picker on today → today shows a primary ring around the pill.
2. Today + selected → both the primary fill AND the ring are visible (ring sits outside the pill via offset).
3. Navigate to a future month and back → today remains marked.
4. Light mode → ring still reads (uses `ring-primary/70`, which scales).
5. No regression on other date pickers (booking flow, reports, etc.) — they gain the same correct indicator.

## Out of scope

- Adding a "Today" text label below the calendar.
- Changing the capacity dot styling (already correct).
- Restructuring the calendar component's API.

## Files touched

- `src/components/ui/calendar.tsx` — replace the `day_today` className with the ringed treatment.
