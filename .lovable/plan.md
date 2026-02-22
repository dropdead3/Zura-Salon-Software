

# Phase 3: Assistant Response Flow, Block Management, and DayView Card Indicators

## Summary

Phases 1 and 2 delivered block creation, overlay rendering across all views, booking flow integration, and the detail panel. Phase 3 closes the loop by giving assistants the ability to **respond** to requests, providing a **management panel** for all blocks, and adding **card-level indicators** on DayView appointments.

No database changes are required -- the existing `assistant_time_blocks` table already supports `status` updates and `assistant_user_id` assignment.

---

## Change 1: Notification Action Buttons (Accept / Decline)

**File**: `src/components/mentions/MentionNotificationBadge.tsx` (or a new `AssistantNotificationActions` component)

The current notification insert (`type: 'assistant_time_block'`) stores `metadata.time_block_id`. However, there is no notification rendering system that handles actionable buttons for this type.

**Approach**: Create an inline action handler in a new lightweight component:

**New file**: `src/components/dashboard/schedule/AssistantBlockActions.tsx`
- Accepts a `timeBlockId` and renders Accept / Decline buttons
- Accept: calls `updateBlock({ id, status: 'confirmed', assistant_user_id: currentUser.id })` and sends a notification back to the requesting stylist
- Decline: calls `updateBlock({ id, status: 'declined' })` and notifies the requester
- Used both from the notification popover (when we detect `type === 'assistant_time_block'`) and from the management panel

Since the existing notification system uses `MentionNotificationBadge` which only handles mentions, we need a parallel notification surface or extend the existing one. The cleanest approach: create a **schedule notification bell** or add assistant block notifications to the existing mention badge with type-specific rendering.

**Chosen approach**: Extend the hook/query pattern to add a `useAssistantBlockNotifications` query that fetches pending blocks where `assistant_user_id = currentUser.id AND status = 'requested'`, surfacing them in a small badge on the Schedule toolbar with accept/decline actions inline.

---

## Change 2: Assistant Block Management Panel

**New file**: `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx`

A slide-out sheet (similar to `AppointmentDetailSheet`) accessible from:
- A new "Assistant Blocks" button in `ScheduleToolbar.tsx`
- The DayView overlay block tooltip (click to manage)

**Contents**:
- Tab 1: "My Requests" -- blocks where `requesting_user_id = currentUser.id`, grouped by date
  - Each row shows: time range, assistant name or "Unassigned", status badge, delete button
  - Unassigned blocks show a "Assign" button to pick an assistant
- Tab 2: "My Assists" -- blocks where `assistant_user_id = currentUser.id`, grouped by date
  - Each row shows: time range, requesting stylist name, status badge, accept/decline buttons for `requested` status
- Tab 3 (admin only): "All Blocks" -- all blocks for the current location/date range
  - Full management: reassign, change status, delete

---

## Change 3: DayView Appointment Card Tooltip -- "Assistant Scheduled" Indicator

**File**: `src/components/dashboard/schedule/DayView.tsx`

Currently, appointment cards show assistant badges from `appointment_assistants`. When a confirmed `assistant_time_block` overlaps an appointment's window, add a subtle indicator:

- In the expanded card tooltip (the existing hover tooltip on each appointment card), add a small `Users` icon with "Coverage scheduled" text when any confirmed time block overlaps
- This is a read-only display -- no interaction, just confidence for the lead stylist
- Logic: filter `assistantTimeBlocks` prop to find blocks where `status === 'confirmed'` and time range overlaps the appointment's `start_time`/`end_time`

---

## Change 4: Schedule Toolbar -- Block Count Badge

**File**: `src/components/dashboard/schedule/ScheduleToolbar.tsx`

Add a small icon button (Users icon) with a badge count showing pending assistant requests:
- For assistants: count of blocks where `assistant_user_id = myId AND status = 'requested'`
- For stylists: count of blocks where `requesting_user_id = myId AND status = 'requested' AND assistant_user_id IS NULL`
- Clicking opens the `AssistantBlockManagerSheet`

---

## Change 5: Overlay Block Click-to-Manage

**File**: `src/components/dashboard/schedule/AssistantBlockOverlay.tsx`

Currently overlay blocks have `pointer-events-auto cursor-default`. Upgrade:
- Change to `cursor-pointer`
- On click, emit a callback (`onBlockClick`) that opens the management sheet focused on that specific block
- Add a small context menu (right-click) with: "Confirm", "Decline", "Delete", "Edit Time" actions depending on the user's relationship to the block

---

## Change 6: Hook -- Pending Block Count for Current User

**File**: `src/hooks/useAssistantTimeBlocks.ts`

Add a new exported function:
```
useMyPendingAssistantBlocks(userId, locationId)
```
- Queries blocks where `(assistant_user_id = userId AND status = 'requested') OR (requesting_user_id = userId AND assistant_user_id IS NULL AND status = 'requested')`
- Returns count + data for badge and management panel
- Uses a short staleTime for responsiveness

---

## Files Summary

| File | Change |
|---|---|
| `src/hooks/useAssistantTimeBlocks.ts` | Add `useMyPendingAssistantBlocks` hook |
| `src/components/dashboard/schedule/AssistantBlockActions.tsx` | New: Accept/Decline button component with notification feedback |
| `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx` | New: Tabbed management sheet (My Requests / My Assists / All Blocks) |
| `src/components/dashboard/schedule/ScheduleToolbar.tsx` | Add assistant block count badge + button to open manager |
| `src/components/dashboard/schedule/AssistantBlockOverlay.tsx` | Add click handler + right-click context menu for block management |
| `src/components/dashboard/schedule/DayView.tsx` | Add "Coverage scheduled" indicator to appointment card tooltips |
| `src/pages/dashboard/Schedule.tsx` | Wire up manager sheet state, pass callbacks to overlay and toolbar |

---

## What This Does NOT Do (Deferred)

- No push notifications or email alerts (in-app only)
- No drag-to-resize time blocks on the calendar (future enhancement)
- No assistant utilization analytics/reporting (separate feature)
- No auto-assignment algorithm (stays manual/semi-manual)

