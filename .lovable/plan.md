

## Validation of the Timezone-Safety Plan

### Is the approach correct?

**Yes, the core approach is correct.** The `Intl.DateTimeFormat` technique to extract org-timezone parts and construct a "virtual now" is a well-established pattern. The key insight — that DB times are stored as naive strings (`HH:mm`, `YYYY-MM-DD`) so no conversion is needed on stored data — is correct and important.

### Potential Issues to Watch

**1. The "fake Date" trap (MOST IMPORTANT)**
The plan constructs a `Date` whose `.getHours()/.getDate()` etc. reflect the org timezone. But internally this Date represents a *different instant in time* than actual `Date.now()`. If this "fake" Date is ever passed to:
- `date-fns` functions like `differenceInMinutes(fakeNow, realDate)` — **wrong result**
- `isSameDay(fakeNow, realDate)` — **wrong result** (comparing two dates in different "frames")
- Any `.getTime()` or `.toISOString()` comparison — **wrong result**

**Mitigation:** The helper functions (`isOrgToday`, `orgNowMinutes`) should be the ONLY interface. We must never leak the fake Date into `date-fns` comparisons with real Dates. The `useOrgNow` hook should return `todayStr` (string) and `nowMinutes` (number), NOT a raw Date object. This avoids accidental misuse.

**2. Late check-in detection in `DayView.tsx` (line 219)**
This uses `isToday(date)` to gate the check AND `new Date()` implicitly for time comparison. Both need to use org time. Already covered in the plan — just confirming it's critical.

**3. `parse(time, 'HH:mm', new Date())` calls are safe** — the `new Date()` base is only used for the date-part seed, and the result is only used for formatting back to a display string. No change needed. ✓

**4. Calendar `disabled` prop (past-date checks)**
`StylistStep.tsx` line 146: `disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}`. This needs org-today, but we need to be careful: the `date` parameter from `react-day-picker` is a real Date at midnight local time. We should compare its `YYYY-MM-DD` string against `getOrgToday()` rather than doing Date arithmetic.

**5. 60-second refresh interval**
Fine for the time indicator and "today" highlight. No issue here.

### Revised Recommendation

Amend the plan slightly:

- **Do NOT expose a fake `Date` object** from `useOrgNow`. Instead expose:
  - `todayStr: string` — `YYYY-MM-DD` in org timezone
  - `nowMinutes: number` — minutes since midnight in org timezone  
  - `isOrgToday(date: Date | string): boolean` — compares against `todayStr`
- This makes misuse impossible since there's no Date object to accidentally pass to `date-fns`.
- All `date < new Date()` past-date checks should become string comparisons: `format(date, 'yyyy-MM-dd') < todayStr`.

### Conclusion

The plan is correct and complete. The one refinement above (avoiding a fake Date object) prevents the most likely class of bugs. With that adjustment, there are no foreseeable issues.

