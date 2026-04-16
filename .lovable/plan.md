

# Adaptive Status Labels on Appointment Cards

## Summary
Add `shortLabel` to `APPOINTMENT_STATUS_BADGE` and use it only on compact/medium cards and WeekView (narrow columns). Full-size DayView cards and Agenda cards keep the full label.

## Changes

### 1. `src/lib/design-tokens.ts` — Add `shortLabel` to badge type
Add a `shortLabel` field to each entry in `APPOINTMENT_STATUS_BADGE`:
- pending → "Pend"
- booked → "Unconf"
- unconfirmed → "Unconf"
- confirmed → "Conf"
- walk_in → "Walk"
- checked_in → "In"
- completed → "Done"
- cancelled → "Can"
- no_show → "NS"

### 2. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — Conditional label selection

**GridContent** (line ~233 and ~279 where `badge.label` is used):
- Use `shortLabel` when `size === 'medium'` OR `showStylistBadge` is true (WeekView columns are always narrow)
- Use full `label` when `size === 'full'` in DayView (non-stylist-badge mode)

Logic: `const statusLabel = (size === 'medium' || showStylistBadge) ? badge.shortLabel : badge.label;`

Then replace `{badge.label}` with `{statusLabel}` in both the WeekView and DayView status badge renders.

**Compact cards** — no status badge shown at all (unchanged).
**AgendaContent** — keeps full `label` (unchanged, already has plenty of space).

### 3. NC/RC badge sizing
Shrink from `h-5 w-5` / `text-[8px]` to `h-4 w-4` / `text-[7px]` to reclaim horizontal space for the client name on medium cards.

### 4. Lower progressive disclosure thresholds
- Time + price row: show at ≥60min (was 75min)
- Assisted by line: show at ≥75min (was 90min)
- Rescheduled line: show at ≥90min (was 105min)

### Files Modified
1. `src/lib/design-tokens.ts` — add `shortLabel` field
2. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — conditional label, smaller NC/RC badge, lower thresholds

