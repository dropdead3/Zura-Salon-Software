

# Calculate Stylist Double-Booked Time

## Approach

Yes — this is fully calculable from existing appointment data. The `v_all_appointments` view contains `stylist_user_id`, `appointment_date`, `start_time`, and `end_time` per appointment. By grouping appointments per stylist per day and detecting time overlaps, we can compute exact double-booked minutes.

## Algorithm

For each stylist on each day:
1. Collect all non-cancelled appointments, sorted by `start_time`
2. For each pair of appointments, detect overlap: `startA < endB && startB < endA`
3. Calculate overlap minutes: `min(endA, endB) - max(startA, startB)`
4. Merge overlapping intervals to avoid triple-counting (union of overlap regions)
5. Sum total overlap minutes per stylist across the date range

## Implementation

### 1. New hook: `src/hooks/useDoubleBookingStats.ts`
- Accepts `dateFrom`, `dateTo`, `locationId?`
- Fetches from `v_all_appointments`: `stylist_user_id`, `staff_name`, `start_time`, `end_time`, `appointment_date`, `status`
- Filters out cancelled/no-show statuses
- Groups by `stylist_user_id` + `appointment_date`
- Runs interval overlap detection per group
- Returns per-stylist: `totalDoubleBookedMinutes`, `doubleBookedSessions` (count of appointments involved), `percentOfSchedule` (overlap minutes / total booked minutes)

### 2. New card: `src/components/dashboard/analytics/DoubleBookingCard.tsx`
- Canonical card header with icon + title + `MetricInfoTooltip`
- Table showing each stylist: name, double-booked hours, % of schedule, session count
- Sorted by double-booked time descending
- Empty state if no overlaps detected

### 3. Integration into `StaffingContent.tsx`
- Add `DoubleBookingCard` into the staffing analytics section

## Technical Detail

Overlap calculation uses an interval-merge algorithm (O(n log n) per day per stylist):

```text
Sort appointments by start_time
merged = []
For each appointment:
  If merged is empty or current.start >= merged.last.end:
    push current to merged
  Else:
    overlap_minutes += min(current.end, merged.last.end) - current.start
    merged.last.end = max(merged.last.end, current.end)
```

Time strings (e.g. "10:00") are converted to minutes-since-midnight for arithmetic.

