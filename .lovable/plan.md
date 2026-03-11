

## Timezone-Safe Scheduling (Implemented)

### Problem
`new Date()` used browser-local timezone for "today", current-time indicators, and past-date validation. Users traveling to different timezones saw incorrect schedule state.

### Solution
- Created `src/lib/orgTime.ts` — pure helpers: `getOrgToday()`, `orgNowMinutes()`, `isOrgToday()`, `isOrgTomorrow()`, `getOrgTodayDate()`
- Created `src/hooks/useOrgNow.ts` — reactive hook returning `todayStr`, `nowMinutes`, `todayDate`, `isToday()`, `isTomorrow()` with 60s refresh
- No fake Date objects exposed — only primitives (string, number) to prevent accidental misuse with date-fns

### Files Updated
- `ScheduleHeader.tsx` — today button, quick days, isToday checks
- `DayView.tsx` — current-time indicator, late check-in detection, past-slot shading
- `WeekView.tsx` — current-time indicator, today/tomorrow labels, past-slot shading
- `MonthView.tsx` — today highlight
- `AgendaView.tsx` — today/tomorrow labels, today border
- `ScheduleActionBar.tsx` — payment queue timing
- `booking/StylistStep.tsx` — quick dates, calendar disabled past-date check
- `meetings/MeetingSchedulerWizard.tsx` — default date, calendar disabled check
- `shifts/ShiftScheduleView.tsx` — today highlight, "This Week" button
- `useHuddles.ts` — today's huddle query
