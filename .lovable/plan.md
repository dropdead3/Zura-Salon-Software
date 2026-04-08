

# Analytics Audit Pass 10: Remaining Issues

After nine passes fixing tip adjustments, pagination, and stale data across 30+ hooks, this pass surfaces the remaining gaps.

## Findings

### Bug 1 — `useOperationalAnalytics.ts` rebook query has no pagination (line 281)
The `rebookQuery` fetches all completed appointments in a date range with only `rebooked_at_checkout` selected — no `.range()` or batching. A busy salon over a 30-day range with 1000+ completed appointments will get a truncated rebook rate.

### Bug 2 — `useOperationalAnalytics.ts` `useAppointmentSummary` has no pagination (line 333)
Queries all appointments in a date range by status without pagination. Multi-location orgs will hit 1000-row truncation, producing incorrect completion/no-show/cancellation rates.

### Bug 3 — `useStylistExperienceScore.ts` — two queries have no pagination (lines 93, 121)
The appointment query (line 93) and the transaction items query (line 121) both fetch unbounded result sets. A 30-day range across a multi-stylist salon can exceed 1000 rows on either query, truncating composite scores.

### Bug 4 — `useServiceDemandTrend.ts` has no pagination (line 21)
Queries 12 weeks of appointments without pagination. A busy salon doing 100+ appointments/week will exceed 1000 rows, truncating the trend data and misclassifying service demand direction.

### Bug 5 — `useAutoDetectEconomics.ts` queries `appointments` table without pagination (line 69)
Fetches 90 days of appointment data without batching. High-volume orgs will get truncated results, leading to incorrect hours-per-month and color-ratio calculations for the economics model.

### Bug 6 — `useClientHealthSegments.ts` future appointments query has no pagination (line 122)
The query for future bookings has no pagination. If many clients have future appointments, the result will truncate and some clients will incorrectly appear in the "needs rebooking" segment.

### Bug 7 — `usePhorestCalendar.ts` main appointment query has no pagination (line 131)
The calendar view fetches `*` (all columns) for a date range without pagination. A multi-stylist salon viewing a week range could exceed 1000 appointments, silently dropping calendar entries.

---

## Implementation Plan

### Task 1 — Add pagination to `useOperationalAnalytics.ts` (2 queries)
- Migrate `rebookQuery` (line 281) to `fetchAllBatched`
- Migrate `useAppointmentSummary` query (line 333) to `fetchAllBatched`

### Task 2 — Add pagination to `useStylistExperienceScore.ts` (2 queries)
- Migrate appointment query (line 93) to `fetchAllBatched`
- Migrate transaction items query (line 121) to `fetchAllBatched`

### Task 3 — Add pagination to `useServiceDemandTrend.ts`
Replace single query with `fetchAllBatched`.

### Task 4 — Add pagination to `useAutoDetectEconomics.ts`
Replace `appointments` table query with `fetchAllBatched`.

### Task 5 — Add pagination to `useClientHealthSegments.ts` and `usePhorestCalendar.ts`
- Replace future appointments query in `useClientHealthSegments` with `fetchAllBatched`
- Replace main calendar query in `usePhorestCalendar` with `fetchAllBatched`

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bug (truncation) | 7 | `useOperationalAnalytics` (2), `useStylistExperienceScore` (2), `useServiceDemandTrend`, `useAutoDetectEconomics`, `useClientHealthSegments`, `usePhorestCalendar` |

5 tasks, 6 files changed, no database changes. No tip/revenue logic bugs found in this pass — previous passes have resolved those systematically.

