
## Add "All Time" Quick Filter to Appointments Hub

### What Changes
Add an "All Time" option to the time period toggle pill (Past | Today | Future | Range) so it becomes (All | Past | Today | Future | Range). Selecting "All" removes all date constraints and shows every appointment.

### File Changed

**`src/components/dashboard/appointments-hub/AppointmentsList.tsx`**

1. Update the `TimePeriod` type (line 33) to include `'all'`:
   ```
   type TimePeriod = 'all' | 'past' | 'today' | 'future' | 'custom';
   ```

2. Add an `'all'` case to `getDateRange` (line 61-77) that returns no date constraints:
   ```
   case 'all':
     return {};
   ```

3. Add an "All" entry as the first item in `TIME_PERIOD_OPTIONS` (line 79-84):
   ```
   { value: 'all', label: 'All', icon: <List className="w-3.5 h-3.5" />, tooltip: 'All Appointments\nNo date filter' },
   ```
   Using the `List` icon from lucide-react (or `Infinity` -- whichever fits better visually).

4. Keep the default `timePeriod` state as `'today'` (line 90) so the hub still opens to today's view by default.

### Technical Notes
- No backend changes needed -- omitting `startDate` and `endDate` from the query already fetches all records (the hook handles this).
- The existing 1000-row limit per source table still applies; pagination handles overflow.
- Import the chosen icon (`List` or `Infinity`) from `lucide-react`.
