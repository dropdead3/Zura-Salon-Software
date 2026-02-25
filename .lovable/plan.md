

## Fix: Use Operating Hours (Not Just Appointments) to Determine "Final Revenue"

You're absolutely right. The current logic only checks `lastAppointmentEndTime`, so when there are zero appointments, it never triggers the "final" state. But if the location has closed for the day, no more revenue is coming — appointment or walk-in.

### Root Cause

The completion check relies solely on `todayActual.lastAppointmentEndTime`. When there are no appointments, that value is `null`, and the code falls through to the default "Revenue So Far Today" label with no completion indicator.

### Fix

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

Compute `allAppointmentsComplete` once (around line 464, near the existing `allLocationsClosed` logic) using a two-path check:

```ts
const allAppointmentsComplete = useMemo(() => {
  if (!isToday) return false;
  const now = new Date();

  // Path 1: All locations are past their closing time
  if (locations && locations.length > 0) {
    const allPastClose = locations.every(loc => {
      const hoursInfo = getLocationHoursForDate(loc.hours_json, loc.holiday_closures, now);
      if (hoursInfo.isClosed) return true; // closed today = no more revenue
      if (!hoursInfo.closeTime) return false; // no hours defined = can't determine
      const [h, m] = hoursInfo.closeTime.split(':').map(Number);
      return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
    });
    if (allPastClose) return true;
  }

  // Path 2: Last appointment has ended (existing logic, as fallback)
  if (todayActual?.lastAppointmentEndTime && todayActual.hasActualData) {
    const [h, m] = todayActual.lastAppointmentEndTime.split(':').map(Number);
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  }

  return false;
}, [isToday, locations, todayActual]);
```

Then replace the three inline IIFEs (lines 613-619, 624-632, 697-717) with references to this single `allAppointmentsComplete` boolean:

1. **Label** (line 613): `allAppointmentsComplete ? 'Final Revenue Today' : 'Revenue So Far Today'`
2. **Tooltip** (line 623): Use `allAppointmentsComplete` to pick tooltip text
3. **Footer indicator** (line 697): When `allAppointmentsComplete` is true, show the green checkmark + "All appointments complete". Otherwise show the estimated final time (or nothing if no appointments exist).

### Additional Import

Add `getLocationHoursForDate` to the existing import from `useLocations` (line 33 already imports `useActiveLocations` and `isClosedOnDate`).

### What Changes for the User

| Scenario | Before | After |
|---|---|---|
| No appointments, past closing time | "Revenue So Far Today" forever | **"Final Revenue Today"** + ✓ All appointments complete |
| No appointments, still open | "Revenue So Far Today" | "Revenue So Far Today" (unchanged) |
| Appointments exist, all ended | "Final Revenue Today" | "Final Revenue Today" (unchanged) |
| All locations closed today | "Revenue So Far Today" | **"Final Revenue Today"** + ✓ All appointments complete |

### Scope

~25 lines changed in 1 file. Replaces 3 duplicated inline IIFEs with 1 shared `useMemo`. Adds `getLocationHoursForDate` to an existing import.

