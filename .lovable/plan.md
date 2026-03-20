

## 15-Minute Time Slots Wired to Location Operating Hours

### What changes

**`src/components/dock/schedule/DockNewBookingSheet.tsx`**

1. **Fetch location hours**: Use the already-loaded `locations` array to extract `hours_json` for the selected location. Derive the open/close times for the selected day (e.g., `selectedDate` → day of week → `hours_json[day].open` / `hours_json[day].close`).

2. **Replace static `TIME_SLOTS` with dynamic generation**:
   - Generate 15-minute increment slots from the location's `open` time to its `close` time for the selected day.
   - If the location is closed that day, show no slots (or a "Closed" message).
   - Default range: `09:00`–`18:00` if no `hours_json` is available.

3. **"Now" slot injection**: If `nowMinutes` rounded to the nearest 15 minutes falls outside the generated operating-hours slots, prepend/append it with the "Now · X:XX" label so walk-ins after hours still work.

4. **Update `getDefaultTime` and `useState` initializer**: Round to nearest **15 minutes** instead of 30.

### Technical details

```typescript
// Derive operating hours for the selected day
const currentLocation = locations.find(l => l.id === selectedLocation);
const dayName = format(new Date(selectedDate + 'T12:00:00'), 'EEEE').toLowerCase();
const dayHours = (currentLocation?.hours_json as any)?.[dayName];
const openTime = dayHours?.closed ? null : (dayHours?.open || '09:00');
const closeTime = dayHours?.closed ? null : (dayHours?.close || '18:00');

// Generate 15-min slots between open and close
const operatingSlots = useMemo(() => {
  if (!openTime || !closeTime) return [];
  const startMins = timeToMinutes(openTime);
  const endMins = timeToMinutes(closeTime);
  const slots: string[] = [];
  for (let m = startMins; m <= endMins; m += 15) {
    slots.push(minutesToTime(m));
  }
  return slots;
}, [openTime, closeTime]);

// Inject "Now" if outside operating hours
const timeSlots = useMemo(() => {
  const nowRounded = Math.ceil(nowMinutes / 15) * 15;
  const nowStr = minutesToTime(nowRounded);
  if (operatingSlots.includes(nowStr)) return operatingSlots;
  return [nowStr, ...operatingSlots].sort();
}, [operatingSlots, nowMinutes]);

// getDefaultTime: round to 15m
const getDefaultTime = useCallback(() => {
  const nearest = Math.ceil(nowMinutes / 15) * 15;
  return minutesToTime(nearest);
}, [nowMinutes]);
```

The time grid rendering already handles the "Now" label for slots not in the standard list — that logic stays.

