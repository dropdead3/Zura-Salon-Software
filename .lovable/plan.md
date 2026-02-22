

# Phase 2: Assistant Time Blocks -- WeekView, AgendaView & Booking Flow Integration

## Summary

Phase 1 delivered the `assistant_time_blocks` table, DayView overlay, request panel, notifications, and conflict detection. Phase 2 extends this to the remaining schedule surfaces (WeekView, AgendaView) and adds a "Request Assistant" shortcut directly into the booking confirmation step.

No database changes are required -- all Phase 2 work is purely frontend.

---

## Change 1: WeekView -- Assistant Time Block Overlay

**File**: `src/components/dashboard/schedule/WeekView.tsx`

**What changes**:
- Add `assistantTimeBlocks` to `WeekViewProps` (typed as `AssistantTimeBlock[]`)
- Import `AssistantBlockOverlay` from `./AssistantBlockOverlay`
- In each day column (after the appointment cards at ~line 686), render `<AssistantBlockOverlay>` filtered to that day's blocks
- Since WeekView has no per-stylist columns, the overlay renders all blocks for the selected location on that date as compact colored bars behind appointments. The `stylistUserId` filter won't apply here, so we'll render all blocks for the day with a simplified visual (thin colored bar at the left edge of the column).

**New sub-component**: `WeekViewAssistantBlocks` (inline in WeekView.tsx) -- a lightweight renderer that maps time blocks to positioned `absolute` bars in the day column, using the same `getEventStyle()` positioning logic already in WeekView. Each bar shows a small Users icon and is color-coded: amber-dashed for unassigned, primary-tinted for confirmed.

---

## Change 2: AgendaView -- Time Block List Items

**File**: `src/components/dashboard/schedule/AgendaView.tsx`

**What changes**:
- Add `assistantTimeBlocks` to `AgendaViewProps`
- Import `AssistantTimeBlock` type
- After the appointment list for each date group, render any time blocks for that date as lightweight list items:
  - Users icon, time range, status badge (requested/confirmed), requesting stylist name, assistant name if assigned
  - Styled with dashed border and subtle background to distinguish from appointment cards
- Blocks are grouped into the same date sections as appointments

---

## Change 3: Schedule.tsx -- Pass Time Blocks to WeekView & AgendaView

**File**: `src/pages/dashboard/Schedule.tsx`

**What changes**:
- Pass `assistantTimeBlocks` prop to `<WeekView>` (~line 578)
- Pass `assistantTimeBlocks` prop to `<AgendaView>` (~line 608)
- The data is already fetched via `useAssistantTimeBlocks` -- just needs to be threaded through

**Note for WeekView**: The current hook fetches blocks for a single date. WeekView shows 7 days. Two options:
- Option A: Call `useAssistantTimeBlocks` 7 times (one per day) -- wasteful
- Option B (chosen): Create a new query variant `useAssistantTimeBlocksRange` in `useAssistantTimeBlocks.ts` that accepts a date range and fetches all blocks within it. This is a single query with `gte/lte` on the `date` column.

---

## Change 4: New Hook Variant -- `useAssistantTimeBlocksRange`

**File**: `src/hooks/useAssistantTimeBlocks.ts`

**What changes**:
- Add a new exported function `useAssistantTimeBlocksRange(startDate, endDate, locationId)` that queries `assistant_time_blocks` where `date >= startDate AND date <= endDate AND location_id = locationId`
- Returns the same `AssistantTimeBlock[]` shape with profile joins
- Used by Schedule.tsx when `view === 'week'` or `view === 'agenda'`

---

## Change 5: Booking Flow -- "Request Assistant" Toggle

**File**: `src/components/dashboard/schedule/QuickBookingPopover.tsx`

**What changes**:
- Add state: `const [requestAssistant, setRequestAssistant] = useState(false)`
- In the confirm step (around line 2140, after the notes section), add an optional toggle:
  - A row with Users icon, "Request Assistant Coverage" label, and a Switch toggle
  - When enabled, shows a brief note: "An assistant time block will be created for the duration of this appointment"
- In the `createBooking.onSuccess` handler (line 745), if `requestAssistant` is true, auto-create an `assistant_time_blocks` row:
  - `date`: booking date
  - `start_time`: booking start time
  - `end_time`: calculated from start + total duration
  - `requesting_user_id`: the selected stylist
  - `assistant_user_id`: null (open request)
  - `status`: 'requested'
  - `location_id`: selected location
  - `organization_id`: from context
- Uses `supabase.from('assistant_time_blocks').insert(...)` directly in the onSuccess callback (fire-and-forget with error logging)

---

## Change 6: Appointment Detail Panel -- "Scheduled During This Window" Section

**File**: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

**What changes**:
- Import and use `useAssistantTimeBlocks` to query blocks for the appointment's date and location
- Filter to blocks that overlap the appointment's time window
- Below the existing "Assistants" section (~line 768), add a new section: "Scheduled Coverage"
  - Lists any overlapping time blocks with: assistant name (or "Unassigned"), time range, status badge
  - Provides visual distinction from per-appointment assistant assignments
  - Label: "Assistants on this appointment" (existing) vs "Scheduled coverage" (new)

---

## Files Modified Summary

| File | Change |
|---|---|
| `src/hooks/useAssistantTimeBlocks.ts` | Add `useAssistantTimeBlocksRange` for multi-day queries |
| `src/components/dashboard/schedule/WeekView.tsx` | Add time block overlay bars in day columns |
| `src/components/dashboard/schedule/AgendaView.tsx` | Add time block list items per date group |
| `src/pages/dashboard/Schedule.tsx` | Pass time block data to WeekView and AgendaView; use range query for week/agenda views |
| `src/components/dashboard/schedule/QuickBookingPopover.tsx` | Add "Request Assistant" toggle on confirm step with auto-creation on booking success |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add "Scheduled Coverage" section showing overlapping time blocks |

