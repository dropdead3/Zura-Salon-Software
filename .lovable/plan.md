

# Exclude Approved Time Off from Utilization Calculations

## Problem

All utilization calculations currently treat every calendar day (or shift day) as a working day, even when a stylist has approved time off. A stylist taking two weeks of vacation would show ~50% utilization for that month — punishing them for approved absence. This affects KPI-driven promotion/retention evaluations, capacity reports, and schedule fill rates.

## Affected Surfaces

| Surface | File | Issue |
|---------|------|-------|
| Stylist level progress (promotion + retention KPIs) | `useLevelProgress.ts` | Shift-based utilization counts shift minutes on time-off days; fallback counts calendar days without exclusion |
| Team level progress (bulk) | `useTeamLevelProgress.ts` | Same logic duplicated for all team members |
| Capacity report | `useCapacityReport.ts` | `workingDays` is raw calendar day diff — never subtracts org-wide time off |
| Schedule utilization bar | `ScheduleUtilizationBar.tsx` | `stylistCount` doesn't subtract stylists who are off that day |

## Approach

### 1. Shared utility: `getApprovedTimeOffDays`

Create a small helper in `src/lib/time-off-utils.ts` that, given approved time-off records, returns a `Set<string>` of `"userId|date"` keys for full-day approved time off, and a parallel function that returns just date strings for org-wide calculations.

### 2. `useLevelProgress.ts` — Fetch and exclude time off

- Add a query for `time_off_requests` where `user_id = userId`, `status = 'approved'`, date range overlaps eval window
- In `computeMetrics`: filter out `userShifts` on dates that overlap approved full-day time off
- In the fallback (no shifts): exclude time-off dates from the `activeDays` denominator

### 3. `useTeamLevelProgress.ts` — Batch fetch and exclude

- Add a single query for all team members' approved time off in the eval window
- Same filtering logic as above, applied per-user in the `computeMetrics` loop

### 4. `useCapacityReport.ts` — Subtract time-off days from capacity denominator

- Fetch approved time-off requests for the date range (optionally filtered by location)
- Count distinct `(user_id, date)` pairs with approved full-day time off
- Subtract from `workingDays * stylistCount` denominator (or at minimum reduce `workingDays` proportionally)

### 5. `ScheduleUtilizationBar.tsx` — Reduce stylist count for the day

- Accept an optional `timeOffUserIds: string[]` prop (stylists off that specific day)
- Subtract from `stylistCount` when computing `availableMinutes`
- Parent component (Schedule page) already has access to time-off data via `useChairAssignments` which queries `time_off_requests`

## Technical Details

**New file**: `src/lib/time-off-utils.ts`
```typescript
// Builds a Set of "userId|YYYY-MM-DD" keys from approved time-off records
// Expands date ranges into individual days
// Used by all utilization hooks to exclude days off
```

**Query pattern** (added to each hook):
```sql
SELECT user_id, start_date, end_date, is_full_day
FROM time_off_requests
WHERE status = 'approved'
  AND start_date <= :endStr
  AND end_date >= :startStr
  AND (user_id = :userId OR user_id IN (:userIds))
```

**Utilization formula change**:
- Before: `totalBookedMinutes / totalShiftMinutes`
- After: `totalBookedMinutes / (totalShiftMinutes - shiftMinutesOnTimeOffDays)`

For the fallback (no shifts): divide by working days minus time-off days instead of raw active days.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/time-off-utils.ts` | **New** — shared date expansion + lookup helpers |
| `src/hooks/useLevelProgress.ts` | Add time-off query, filter shifts/days in `computeMetrics` |
| `src/hooks/useTeamLevelProgress.ts` | Add batch time-off query, same filtering per user |
| `src/hooks/useCapacityReport.ts` | Fetch time-off, reduce capacity denominator |
| `src/components/dashboard/schedule/ScheduleUtilizationBar.tsx` | Accept + apply `timeOffUserIds` prop |

**5 files. No database changes.**

