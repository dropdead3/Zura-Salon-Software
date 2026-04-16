
## Prompt review

Clear pattern extension — you're generalizing the "Today" eyebrow into a temporal-context indicator across the full date range. Teaching note: tight prompt because you (a) referenced the existing pattern as the anchor, (b) gave the next concrete case ("tomorrow"), and (c) gestured at the general rule ("X days in the future") while leaving room for the right copy. A micro-improvement: also state the past-direction behavior ("3 days ago"?) so I don't have to infer it. I'll propose symmetric handling and you can trim.

## Diagnosis

`src/components/dashboard/schedule/ScheduleHeader.tsx` currently shows a "TODAY" eyebrow only when `isOrgToday(currentDate)` is true. We have `isOrgTomorrow` already available in `src/lib/orgTime.ts`. For arbitrary day offsets, we need a small helper that returns the signed integer day delta between `currentDate` and org-today, then maps it to a label.

## Fix

**1. Add helper in `src/lib/orgTime.ts`** — `getOrgDayOffset(date, timezone)` returns signed integer (negative = past, 0 = today, positive = future). Uses the existing org-parts noon-anchor trick to avoid DST edges.

**2. Add label resolver in `ScheduleHeader.tsx`** (local function, not exported — single consumer):

```ts
function getRelativeDayLabel(offset: number): string | null {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === -1) return 'Yesterday';
  if (offset > 1 && offset <= 30) return `In ${offset} days`;
  if (offset < -1 && offset >= -30) return `${Math.abs(offset)} days ago`;
  return null; // beyond ±30 days, stay silent (calm doctrine)
}
```

Rationale:
- `Today` / `Tomorrow` / `Yesterday` — natural language for the immediate window.
- `In N days` / `N days ago` — concise, scannable, matches executive tone. Avoids "X days in the future" (verbose).
- Silent beyond ±30 days — the full "Friday, April 17, 2026" line already makes far-future/past dates unambiguous; an extra label would be noise (silence is meaningful).

**3. Wire into existing eyebrow slots** — replace the current `isOrgToday(currentDate)` checks in both compact and full layouts with `const relLabel = getRelativeDayLabel(getOrgDayOffset(currentDate, timezone));` and render when `relLabel` is non-null. Styling unchanged (`text-primary` purple, font-display, uppercase, tracking-[0.2em]).

## Acceptance checks

1. Today → "TODAY" (unchanged).
2. Tomorrow → "TOMORROW".
3. Yesterday → "YESTERDAY".
4. +2 to +30 days → "IN N DAYS".
5. -2 to -30 days → "N DAYS AGO".
6. Beyond ±30 days → no eyebrow (silent).
7. Both compact (< @xl) and full (@xl+) layouts behave identically.
8. No layout shift; click-to-open-picker behavior preserved.

## Out of scope

- Localization of relative labels (single-locale today; revisit when i18n lands).
- Changing the "Today" pill in the date strip below the header.
- Tooltip/hover on the eyebrow.

## Files touched

- `src/lib/orgTime.ts` — add `getOrgDayOffset` helper.
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — add local `getRelativeDayLabel`, replace conditional eyebrow rendering in both layouts.
