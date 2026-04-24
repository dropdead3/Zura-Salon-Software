

## Prompt feedback
Strong observation prompt — you named the symptom (utilization capped at 100%), the cause (double/triple booking the same slot), and the desired behavior (200%/300% should surface). Sharper next time: name where you saw it ("on the Schedule day-view stylist column badge" vs "the Operational Analytics Staff Utilization tab" vs "the Sales card"), and what severity threshold you want surfaced as a structural alert (e.g. ">150% triggers an over-booking warning"). The fix differs slightly per surface — knowing which one is highest priority lets the rollout land in a more useful order.

## What's broken

`computeUtilizationByStylist` in `src/lib/schedule-utilization.ts` is the system-of-record utilization calculator. Two design choices today silently hide double-booking:

1. **Sum-of-durations math is correct, but the result is force-clamped:** `Math.min(Math.round((booked / totalAvailable) * 100), 100)`. A stylist with 8h available and three 2h appointments stacked at the same time accumulates 6h of booked time → 75%. Same three appointments stacked on top of each other accumulates the same 6h → also 75%. That's *coincidentally* right when overlapped duration equals serial duration — but in the more common case (8h available, six 2h appointments where three overlap) the booked total is 12h → math says 150%, code displays 100%. Operators see "fully booked" when they're actually catastrophically over-booked.
2. **No structural distinction between "fully utilized" and "over-utilized":** the column-sort badge, the staff dropdown capacity badge, and the date-picker capacity tier all read the same clamped 0–100 number. There's no signal telling a manager "this stylist is at 200% — they're triple-booking 4 hours of their day."

Same anti-pattern exists in two adjacent surfaces (audit, not just one fix):

- `src/hooks/useHistoricalCapacityUtilization.ts` line 264 — `Math.round((day.bookedHours / day.availableHours) * 100)` — no `Math.min`, but applied across `stylistCapacity * effectiveHours` so individual stylist over-booking averages out and never surfaces. The location-level number reads "70%" while a single stylist is at 250%.
- `src/hooks/useLocationStaffingBalance.ts` line 168 — same shape, location aggregate, same averaging problem; classifies the location as "balanced" when individuals are drowning.
- `src/hooks/useStaffUtilization.ts` (Operational Analytics tab) — uses appointment **count** relative to team max, not time, so it's a different metric and out of scope for this fix; flag separately below.

## The fix — three layers

### 1. Allow utilization to exceed 100% in `computeUtilizationByStylist` (single source of truth)

- Drop `Math.min(..., 100)`. Return the raw rounded percentage (0 to ∞).
- Add a second value to the return type: `Map<string, { utilization: number; overbookedMinutes: number; isOverbooked: boolean }>`. `overbookedMinutes` = `max(0, booked − totalAvailable)`. `isOverbooked` = `utilization > 100`.
- Keep all existing call sites working via a thin adapter: `getUtilizationByStylist(...)` returns the legacy `Map<string, number>` (uncapped now), and the new `getUtilizationDetailsByStylist(...)` returns the rich shape.
- Reasoning: stylist-level utilization is computed against a single stylist's time budget, where overlapping appointments are unambiguously over-booking. Math is sound; the clamp was a UI defense, not a data invariant.

### 2. Compute per-stylist overlap correctly in the location/historical aggregates

The location-level hooks (`useHistoricalCapacityUtilization`, `useLocationStaffingBalance`) currently sum *all* appointment durations into a single `bookedHours` against `stylistCapacity × effectiveHours`. Two fixes:

- **Per-stylist accumulation**: Bucket each appointment by `stylist_user_id` first, sum durations per stylist, then sum *each stylist's* booked hours into the location aggregate. Mathematically identical to today when there's no double-booking — different (and correct) when there is.
- **Surface a separate `overbookedHours` field** on `DayCapacity` and `LocationBalance`: sum of `max(0, stylistBooked − stylistAvailable)` across all stylists in that location/day. This is the new signal: "12 hours of double-booked time today across 4 stylists."

### 3. UI surfaces — show the over-booking, don't hide it

Three call-site changes (everything else picks up the new uncapped number for free):

| Surface | Today | After |
|---|---|---|
| `DayView.tsx` stylist column badge (line 540-544) | "85%" / "100%" | "85%" / "150% ⚠ Over-booked" — when `>100`, render in `text-orange-400` ≤150 / `text-red-400` >150 with `AlertTriangle` icon |
| `ScheduleHeader.tsx` staff dropdown capacity badge | clamped 0–100 | uncapped value, same color thresholds, tooltip lists stylists currently >100% |
| `ScheduleHeader.tsx` date-picker capacity tier (line 198-200) | tiers based on clamped average | new tier `over-capacity` triggered when *any* stylist on that date is `>100`; renders date with red ring |
| `OperationalAnalytics` Staff Utilization tab — new column | (no over-book signal) | "Over-booked Hours" column derived from per-stylist overlap math; sortable; surfaces who's burning out |
| `useLocationStaffingBalance` — new banner condition | "balanced/understaffed/overstaffed" | adds a fourth status: `over-booked` when `overbookedHours > 0`, classified above understaffed in severity |

The over-booking thresholds should be configurable (org setting `over_booking_warn_threshold` default `100`, `over_booking_critical_threshold` default `150`) — but we ship hardcoded defaults this pass and add the org setting in a follow-up so we don't widen scope.

### Edge cases handled

- **Block / Break categories**: already excluded via `BLOCKED_CATEGORIES`. Continue excluding from booked total — they're capacity reductions, not bookings.
- **Cancelled / no-show**: already excluded via `EXCLUDED_STATUSES`. Continue.
- **Stylists with no defined working hours window**: today the code uses the schedule-view `hoursStart`/`hoursEnd` as the denominator, which is *the visible scheduler window*, not the stylist's actual schedule. Out of scope for this pass — flagged in follow-ups. The over-capacity signal is still meaningful relative to the same denominator we use today; a stylist double-booked across 8h is double-booked regardless of which 8h we measure.
- **Group-service appointments** (one slot, multiple clients) — currently each row is one appointment, so no special handling needed.
- **Assistant time blocks** — already in a separate category; not counted in stylist utilization.

## Files involved

**Modified:**
- `src/lib/schedule-utilization.ts` — drop the clamp; add detailed return shape; add adapter for legacy callers
- `src/hooks/useHistoricalCapacityUtilization.ts` — per-stylist accumulation; new `overbookedHours` field on `DayCapacity` and `CapacityData`
- `src/hooks/useLocationStaffingBalance.ts` — per-stylist accumulation; new `overbookedHours` field; new `'over-booked'` status in `classify()`
- `src/components/dashboard/schedule/DayView.tsx` — stylist column badge color/icon when `>100`
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — staff dropdown capacity badge uncapped + tooltip; date-picker `over-capacity` tier
- `src/components/dashboard/analytics/StaffUtilizationContent.tsx` — new "Over-booked Hours" column
- `src/components/dashboard/analytics/CapacityUtilizationSection.tsx` — surface `overbookedHours` in the daily breakdown card
- `src/components/dashboard/sales/CapacityUtilizationCard.tsx` — same

**New:**
- `src/lib/__tests__/schedule-utilization.test.ts` — Vitest covering: no overlap = serial sum, full overlap = double the booked total, partial overlap = correct sum, single stylist >100% surfaces uncapped, location aggregate sums per-stylist overbookedMinutes correctly

**Untouched (intentionally):**
- `src/hooks/useStaffUtilization.ts` — uses appointment count vs team max (a different "utilization"). Renaming or fixing it is a separate scope; flagged in the follow-ups section.

## What stays the same

- The signal-to-noise philosophy of the doctrine — over-booking is a *high-impact deviation* worth surfacing, exactly the kind of structural drift the lever doctrine says we *should* alert on. This change brings utilization into compliance with that doctrine.
- All existing call sites continue to compile via the legacy adapter.
- POS-First data integrity: utilization is still computed from `v_all_appointments`, no schema changes.
- Block/Break exclusion, cancelled/no-show exclusion.

## QA checklist

- Stylist with 8h available, 4× 2h sequential appointments → utilization = 100%, isOverbooked = false (regression check)
- Stylist with 8h available, 4× 2h appointments where two overlap fully → booked = 8h, utilization = 100% (math: overlap counts as double, not single — confirms the doctrine)
- Stylist with 8h available, 6× 2h appointments where three overlap → booked = 12h, utilization = 150%, badge shows orange + ⚠
- Stylist triple-booked 4h on top of a normal 8h day → booked = 16h, utilization = 200%, badge shows red + ⚠
- Location aggregate with one stylist at 200% and three at 50% → location utilization renders correctly per-stylist-summed (250% total stylist hours / 320% total available stylist hours = 78%, not artificially smoothed) AND `overbookedHours` field shows the 4h overlap
- DayView column sort still orders by raw utilization (highest first now means most over-booked first)
- ScheduleHeader date-picker shows red-ring tier when any stylist on that date is over-booked
- Vitest suite passes; no other tests regress

## Follow-ups (separate scope, do not bundle)

1. **Configurable thresholds** — `over_booking_warn_threshold` / `over_booking_critical_threshold` org settings.
2. **Use stylist-specific working hours** as the denominator instead of the scheduler window — requires `stylist_schedules` integration; meaningful but separate.
3. **Reconcile `useStaffUtilization`** (count-based "utilization score") with the time-based definition — name collision is already misleading; either rename to `relativeWorkloadScore` or migrate it to the same time-based math.
4. **Weekly Intelligence Brief lever** — once over-booking is measurable, add a recurring lever: "3 stylists averaged >120% utilization last week — service quality and retention risk."

## Enhancement suggestion

The reason this bug shipped is that `Math.min(..., 100)` looks defensive ("don't let the UI display a weird number") but is actually destructive ("erase the strongest signal in the dataset"). That's a recurring anti-pattern worth naming as its own canon: **"Clamp at the boundary of meaning, not at the boundary of comfort."** A division-by-zero clamp is at the boundary of meaning (no work day = no utilization to display). A "cap percentages at 100%" clamp is at the boundary of comfort — and erases the signal that matters most. Worth one short `mem://architecture/signal-preservation.md` entry the next time we ship a metric, before the next "looks weird, let's clamp it" decision repeats. Same shape as the alert-fatigue / silence-is-meaningful doctrine: numbers outside the comfortable range are usually the ones operators most need to see.

