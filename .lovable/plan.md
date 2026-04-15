

## Fix: "Concluded" Showing Before Day Begins → Add "First Appt at X" State

### Problem
When `inSessionCount === 0`, the hook checks only for `completed`/`checked_in` appointments to set `dayHadAppointments`. Before the first appointment starts, there are no completed appointments, so `dayHadAppointments = false` and the indicator hides entirely. However, if a *previous* day's data is cached or the query runs mid-morning before service starts, the "Concluded" label can appear incorrectly because the hook doesn't distinguish between "day hasn't started" and "day is over."

The real gap: there's no third state — **"day ahead"** — where appointments exist today but none have started yet.

### Solution
Add a `firstAppointmentTime` field to the hook and a new visual state to the indicator.

### Hook Change (`src/hooks/useLiveSessionSnapshot.ts`)

In the `inSessionCount === 0` branch (line 66-79):

1. After checking for completed appointments, also query for **any** appointments today (regardless of status) to detect scheduled-but-not-started
2. If upcoming appointments exist, find the earliest `start_time` and return it as `firstAppointmentTime`
3. Logic becomes:
   - `dayHadAppointments = true` + no active → **"Day concluded"**
   - `dayHadAppointments = false` + `firstAppointmentTime` exists → **"First appt at X"**
   - Neither → hide (truly empty day)

New field on `LiveSessionSnapshot`:
```
firstAppointmentTime: string | null;
```

Query addition (inside the `inSessionCount === 0` block):
```sql
-- Get earliest appointment today (any non-cancelled status)
SELECT start_time FROM v_all_appointments
WHERE appointment_date = today
  AND deleted_at IS NULL
  AND status NOT IN ('cancelled', 'no_show')
ORDER BY start_time ASC
LIMIT 1
```

### Indicator Change (`src/components/dashboard/LiveSessionIndicator.tsx`)

Add a new state between "hide" and "concluded":

- **Icon**: `Clock` (from lucide-react) instead of `Moon`
- **Label**: `"First appt at {formattedTime}"` (full) / `"Starts {formattedTime}"` (compact)
- **Style**: Same pill as concluded — muted, no pulse dot

Flow becomes:
```text
inSessionCount > 0    → green pulse + "X stylists in service now"
inSessionCount === 0:
  firstAppointmentTime  → clock icon + "First appt at 9:00 AM"
  dayHadAppointments    → moon icon + "Day concluded"
  neither               → null (hidden)
```

### Files Modified
- `src/hooks/useLiveSessionSnapshot.ts` — add `firstAppointmentTime` field + upcoming query
- `src/components/dashboard/LiveSessionIndicator.tsx` — add pre-service state with Clock icon

### Technical Details
- Time formatting: `format(parse(startTime, 'HH:mm:ss', new Date()), 'h:mm a')` using date-fns
- The upcoming appointments query reuses `applyLocationFilter` for location scoping
- `firstAppointmentTime` is only populated when `inSessionCount === 0` and `dayHadAppointments === false`

