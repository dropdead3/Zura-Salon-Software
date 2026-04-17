

## Goal
Refine the rebook prompt in the checkout flow to:
1. Replace the smart 2-button suggestion with a uniform toggle row of week intervals: **1, 2, 3, 4, 6, 8, 10, 12 weeks**
2. Surface a **scripted verbal prompt** for the stylist to read aloud, modeling proper commitment language
3. Pre-select the recommended interval (based on service category) but allow override

## Investigation findings

- Current component: `src/components/dashboard/schedule/NextVisitRecommendation.tsx`
- Logic source: `src/lib/scheduling/rebook-recommender.ts` (returns 2 intervals via category match)
- Used inside `CheckoutSummarySheet` rebooking gate
- `onBookInterval(interval)` triggers downstream booking; `onScheduleManually` opens picker; `onDecline` skips

## Design

### New layout (top → bottom)
1. **Verbal Script Card** (calm, advisory) — quoted prompt the stylist reads:
   > "I'd like to see you back in **6 weeks**. How does **Tuesday, May 27 at 2:00 PM** sound?"
   - Week count and date update live as the stylist toggles intervals
   - Time portion shown if available; otherwise softens to "How does **Tuesday, May 27** work?"

2. **Interval Toggle Row** — `ToggleGroup` (single select) with 8 chips: `1w · 2w · 3w · 4w · 6w · 8w · 10w · 12w`
   - Each chip shows week number on top, target date (`May 27`) below
   - Default selection = recommended interval from `rebook-recommender` (e.g., color → 6w)
   - Recommended chip gets a subtle "Recommended" dot/ring

3. **Primary action**: `Book [Date] at [Time]` (full-width)
4. **Secondary row**: `Pick a Date` · `Skip`

### Token compliance
- `font-display` uppercase for the section header ("NEXT VISIT")
- `font-sans` for the verbal script (body, normal case — never uppercase per canon)
- `tokens.button.card` for primary CTA, `tokens.button.inline` for secondary
- No `font-bold`/`font-semibold` — emphasis via size + color contrast
- Toggle chips use existing `ToggleGroup` primitive

### Logic changes
**`src/lib/scheduling/rebook-recommender.ts`**
- Add `REBOOK_INTERVAL_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 12]` constant
- Add `getAllRebookIntervals(fromDate)` → returns all 8 intervals as `RebookInterval[]`
- Add `getRecommendedWeeks(serviceName, serviceCategory)` → returns the single recommended week count (first value from existing config) for default selection
- Keep existing `getRecommendedRebookIntervals` and `getRebookServiceLabel` (still used elsewhere if needed)

**`src/components/dashboard/schedule/NextVisitRecommendation.tsx`** — full rewrite:
- Replace 2-button grid with `ToggleGroup` of 8 chips
- Add verbal-script card at top with live-bound week/date/time
- Add primary "Book" CTA bound to currently selected interval
- Keep `onBookInterval`, `onScheduleManually`, `onDecline` props intact (no parent changes needed)

### Open question
Time of day for the verbal script — should we default to the **same time as the original appointment** (e.g., they came in at 2 PM, suggest 2 PM), or omit time and let the date picker resolve it later?

## Files to change
1. `src/lib/scheduling/rebook-recommender.ts` — add helpers
2. `src/components/dashboard/schedule/NextVisitRecommendation.tsx` — rewrite UI

## Out of scope
- Changes to `CheckoutSummarySheet` or downstream booking flow
- Time-slot availability checking (handled by manual date picker if needed)

