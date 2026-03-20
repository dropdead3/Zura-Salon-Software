

## Fix Time Selector: Restore "Now" Label and Filter Out-of-Hours Slots

### Problems

1. **"Now" label missing**: The time slot button renders `formatTime12h(t)` for all slots. The `isNowSlot` variable is computed (line 1216) but never used to show a "Now" label.

2. **Out-of-hours times (5:00 AM, 5:15 AM)**: Lines 130-134 always inject the current rounded time into the slot list, even when it falls outside operating hours. If a user opens the wizard at 5 AM, that time gets prepended. This should only happen for today's date, and even then it's debatable — but at minimum, times outside operating hours should not appear.

### Changes

**`src/components/dock/schedule/DockNewBookingSheet.tsx`**

1. **Stop injecting out-of-hours "Now" slot** (lines 130-134): Only inject the now-slot if:
   - The selected date is today, AND
   - The now-rounded time falls within operating hours (between open and close)
   
   If outside hours, don't add it — let the user pick from valid operating-hour slots.

2. **Restore "Now" label on the time button** (line 1228): When the slot matches the current rounded time and the selected date is today, render "Now" instead of (or alongside) the formatted time, e.g. `"Now"` or `"Now · 2:15 PM"`.

### Technical detail

```
// Line 130-134 replacement:
const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
const nowRounded = Math.ceil(nowMinutes / 15) * 15;
const nowStr = minutesToTime(nowRounded);
if (isToday && opSlots.length > 0 && !opSlots.includes(nowStr)) {
  // Only inject if within operating window
  const startMins = timeToMinutes(openTime!);
  const endMins = timeToMinutes(closeTime!);
  if (nowRounded >= startMins && nowRounded <= endMins) {
    return [nowStr, ...opSlots];
  }
}
if (opSlots.length === 0) return [nowStr]; // fallback for closed days
return opSlots;
```

```
// Line 1228 — add "Now" label:
const isToday = date === format(new Date(), 'yyyy-MM-dd');
const nowRounded = minutesToTime(Math.ceil(nowMinutes / 15) * 15);
// In the button text:
{isToday && t === nowRounded ? `Now · ${formatTime12h(t)}` : formatTime12h(t)}
```

