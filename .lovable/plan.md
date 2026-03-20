

## Remove Time Clamping — Always Default to "Now"

**Problem**: The current logic clamps the default time to operating hours (8 AM–8 PM). If a stylist takes a walk-in at 8:30 PM, the time defaults to 8:00 PM instead of the actual current time. The time picker also doesn't show slots past 7:30 PM.

### Changes — `src/components/dock/schedule/DockNewBookingSheet.tsx`

**1. Extend TIME_SLOTS to cover a wider range** (lines 52-56)
- Extend from `6:00 AM – 10:00 PM` to accommodate early/late walk-ins
- Also add a "Now" indicator on the slot that matches the current rounded time

**2. Remove clamping from `getDefaultTime`** (lines 80-86)
- Round `nowMinutes` to the nearest 30-min slot without clamping
- If the result falls outside TIME_SLOTS, dynamically inject it as a "Now" option

**3. Same for the `useState` initializer** (lines 95-100)
- Use `getDefaultTime()` call instead of duplicated inline logic

**4. Same for `handleClose` reset** (line 306) — already uses `getDefaultTime()`, no change needed

### Updated logic

```typescript
// TIME_SLOTS: extend range from 6:00 AM to 10:00 PM
const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const hour = 6 + Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

// getDefaultTime: round to nearest 30m, NO clamping
const getDefaultTime = useCallback(() => {
  const nearest = Math.ceil(nowMinutes / 30) * 30;
  const h = String(Math.floor(nearest / 60)).padStart(2, '0');
  const m = String(nearest % 60).padStart(2, '0');
  return `${h}:${m}`;
}, [nowMinutes]);
```

In the time grid rendering, if `selectedTime` isn't in `TIME_SLOTS` (e.g. 10:30 PM walk-in), prepend/append it with a "Now" label so it's always selectable.

