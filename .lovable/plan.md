

## Filter Scheduler Columns by Stylist Work Days

### Implementation
**1 file**: `src/pages/dashboard/Schedule.tsx`

1. Add a query for `employee_location_schedules` to fetch `user_id` and `work_days` for the selected location
2. In the `allStylists` useMemo, filter out stylists whose schedule excludes the current day — stylists with no schedule entry default to visible
3. Stylists added via the fallback path (they have appointments that day) will still appear regardless of schedule

### Technical Details
- New query: `schedule-stylist-work-days` keyed on `selectedLocation`
- Day key derived from `currentDate.getDay()` using `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']`
- Filter applied after staff map is built, before returning the array
- `stylistSchedules` and `currentDate` added to useMemo deps

