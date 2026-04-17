

## Goal
Layer three enhancements onto the rebook flow to make it learn from behavior, coachable, and more committal in language.

## Enhancement 1 — Track Interval Acceptance
**Why:** Learn which week intervals clients actually commit to per service category, so defaults get smarter over time per organization.

**Schema change** (migration):
- Add column `rebooked_at_weeks INTEGER` on `appointments` table (nullable)
- Populated when stylist confirms a rebook from the script — captures the toggle value selected (1, 2, 3, 4, 6, 8, 10, 12)
- Index on `(organization_id, service_category, rebooked_at_weeks)` for aggregation queries

**Wiring:**
- `CheckoutSummarySheet` already calls `onBookInterval(interval)`. Extend the downstream booking handler to write `rebooked_at_weeks: interval.weeks` to the **source** appointment (not the new one).
- Future: a nightly job can compute median accepted interval per service category per org and feed back into `rebook-recommender.ts` via a `learned_intervals` table. (Out of scope for this wave — schema only.)

## Enhancement 2 — Stylist-Level Rebook Rate KPI
**Why:** Turns the script from a UI feature into a coachable behavior. Surfaces who is converting and who needs coaching.

**Implementation:**
- New hook: `src/hooks/useStylistRebookRate.ts` — mirrors `useRebookingRate.ts` but groups by `staff_id` over a date range
- Surface as a tile in **Staff Reports** (`StaffPerformanceCard` / stylist scorecard)
- Format: `68% rebook rate` with delta vs org average
- Honors the visibility contract: returns `null` if completed appointments < 10 in window (insufficient sample)
- Reuses `v_all_appointments` view + existing `rebooked_at_checkout` boolean — no schema change needed

**Coaching surface:**
- Add to `TodaysPrepSection` coach script when stylist's 30-day rebook rate < org median by >15 pts: "Your rebook rate is X% — try the new commitment script today."

## Enhancement 3 — Time-Aware Verbal Script
**Why:** "How does Tuesday May 27 at 2:00 PM work?" is materially more committal than date-only.

**Implementation:**
- `CheckoutSummarySheet` passes `appointmentStartTime` (HH:mm) prop into `NextVisitRecommendation`
- Update script template:
  - With time: `"...How does {dayLabel} at {timeLabel} work?"`
  - Without time (fallback): `"...How does {dayLabel} work?"`
- Same time-of-day is the default suggestion (assumes client prefers consistent slot). If stylist wants different time, they use **Pick a Date** for full picker.
- `format(date, 'h:mm a')` for time label

## Files to change
1. **New migration** — add `rebooked_at_weeks` column + index on `appointments`
2. `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — pass `appointmentStartTime`, persist `rebooked_at_weeks` on confirm
3. `src/components/dashboard/schedule/NextVisitRecommendation.tsx` — accept optional `startTime` prop, render time in script
4. **New file** `src/hooks/useStylistRebookRate.ts` — per-stylist rebook rate with sample-size gate
5. **Edit** `src/components/dashboard/staff/StaffPerformanceCard.tsx` (or equivalent stylist scorecard) — surface KPI tile
6. `src/components/dashboard/schedule/TodaysPrepSection.tsx` — conditional coaching script when rebook rate lags

## Doctrine compliance
- **Visibility contract:** stylist KPI returns `null` if sample <10; coach script appears only on material gap
- **Tenant isolation:** all queries scoped via existing `v_all_appointments` view (already org-scoped)
- **Phorest write-back:** `rebooked_at_weeks` is Zura-native only, never synced back to Phorest
- **Tokens:** new KPI tile uses `tokens.kpi.label` / `tokens.kpi.value`, no `font-bold`
- **Privacy:** no monetary values, no `BlurredAmount` needed

## Open question
Stylist scorecard placement — surface the rebook rate KPI on the **Staff Performance Card** (existing card grid) or as a new dedicated tile in **Today's Prep** for the logged-in stylist's self-view? Or both?

## Out of scope (future wave)
- Smart defaults learned from `rebooked_at_weeks` aggregation
- Org-wide rebook rate leaderboard
- Rebook rate trend sparkline

