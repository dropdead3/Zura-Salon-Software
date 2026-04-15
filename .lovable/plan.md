

# Scheduler Audit — Implementation Plan

## Summary
Fix timezone bugs, propagate missing indicators, wire unused metrics, and clean dead code across the scheduler.

---

## Phase 1: Timezone Consistency
Replace all `new Date()` calls with org-timezone-aware equivalents (`orgToday` / `getOrgTodayDate`).

**Files:** `Schedule.tsx`, `WeekView.tsx`
- `WeekView.tsx:176` — week calculation uses `new Date()` instead of org timezone
- `Schedule.tsx:939` — action bar today filter uses `new Date()`
- `Schedule.tsx:289` — `todayAppointmentCount` uses `new Date()`

## Phase 2: WeekView Navigation Fix
Bind `WeekView` to `currentDate` prop so header date navigation actually changes the displayed week (currently always shows "today + 6").

**File:** `WeekView.tsx`

## Phase 3: Overdue Indicators Across Views
Propagate `isOverdueForCheckin` detection to `WeekView` and `AgendaView` appointment cards, matching DayView behavior.

**Files:** `WeekView.tsx`, `AgendaView.tsx`
- Add `IndicatorCluster` to `MonthView` cards for consistency

## Phase 4: Fix Jump Ahead Button Label
Replace the misleading `{stylists.length} +` label with an appropriate icon or "Jump" text.

**File:** `ScheduleHeader.tsx`

## Phase 5: Wire ScheduleUtilizationBar
The component is imported but never rendered. Place it as a compact strip between header and calendar. Wrap the revenue `$` value in `BlurredAmount` for privacy compliance.

**Files:** `Schedule.tsx`, `ScheduleUtilizationBar.tsx`

## Phase 6: Show Action Bar on Agenda View
Currently only renders for day/week. Extend to agenda view.

**File:** `Schedule.tsx`

## Phase 7: Delete Dead Code
Remove `ScheduleToolbar.tsx` — fully replaced by `ScheduleHeader`, contains unscoped queries.

## Phase 8: Unify Week View Slot Click
Week view renders inline `QuickBookingPopover` per slot, bypassing the type selector (meeting vs booking) for dual-role users. Route through the same `onSlotClick` handler as DayView.

**Files:** `WeekView.tsx`, `Schedule.tsx`

---

## Files to Modify
- `src/pages/dashboard/Schedule.tsx`
- `src/components/dashboard/schedule/WeekView.tsx`
- `src/components/dashboard/schedule/AgendaView.tsx`
- `src/components/dashboard/schedule/MonthView.tsx`
- `src/components/dashboard/schedule/ScheduleHeader.tsx`
- `src/components/dashboard/schedule/ScheduleUtilizationBar.tsx`
- `src/components/dashboard/schedule/ScheduleToolbar.tsx` (delete)

## Verification
- All views reflect org timezone, not browser clock
- Week view navigates when header date changes
- Overdue badges appear in week/agenda/month views
- Utilization bar visible with blurred revenue
- Action bar visible on agenda view
- No regressions on day view scrolling or action bar visibility

