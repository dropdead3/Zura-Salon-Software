

# Phase 4: Realtime Updates, Availability-Aware Requests, and Notification Rendering

## Summary

Phases 1-3 built the full assistant time block lifecycle: creation, visibility across all views, management, and response flow. Phase 4 focuses on **operational polish** -- making the system feel alive with realtime updates, integrating availability intelligence into the request flow, and surfacing assistant block notifications in the existing notification feed.

---

## Change 1: Realtime Subscription for Assistant Time Blocks

**File**: `src/hooks/useAssistantTimeBlocks.ts`

The `assistant_time_blocks` table already has realtime enabled (migration `20260222205848`), but no client-side subscription exists. When one user accepts/declines a block, other users only see the update after `staleTime` expires (30 seconds).

**What changes**:
- In `useAssistantTimeBlocks`, add a `useEffect` that subscribes to `postgres_changes` on `assistant_time_blocks` filtered by `location_id` and `date`
- On any INSERT, UPDATE, or DELETE event, invalidate the relevant query keys (`assistant-time-blocks`, `assistant-time-blocks-range`, `assistant-pending-blocks`)
- Clean up the channel subscription on unmount
- This gives all users on the schedule page instant visual feedback when blocks change

---

## Change 2: Availability-Aware Assistant Picker in RequestAssistantPanel

**File**: `src/components/dashboard/schedule/RequestAssistantPanel.tsx`

Currently the "Assign to" picker shows all team members regardless of whether they're working that day. The `useAssistantsAtLocation` hook already exists in `useAssistantAvailability.ts` but isn't used.

**What changes**:
- Import `useAssistantsAtLocation` from `@/hooks/useAssistantAvailability`
- Use it to get assistants scheduled at the selected location on the selected date
- Show available assistants at the top of the picker with a green indicator
- Show other team members below with a "(not scheduled)" label
- Add conflict indicators using `useAssistantConflictCheck` to mark assistants who have overlapping commitments

---

## Change 3: Conflict Warning on QuickBookingPopover Assistant Toggle

**File**: `src/components/dashboard/schedule/QuickBookingPopover.tsx`

When the "Request Assistant Coverage" toggle is enabled during booking, there is no check for whether assistants are actually available at that location/time.

**What changes**:
- Import `useHasAssistantAvailability` from `@/hooks/useAssistantAvailability`
- When the toggle is on, show a subtle info/warning note:
  - If assistants are available: "X assistants are scheduled at this location"
  - If none available: "No assistants are scheduled this day -- request will go to the open pool"
- This is advisory only -- does not block the request

---

## Change 4: Notification Feed Integration

**File**: New file `src/components/dashboard/schedule/AssistantBlockNotificationItem.tsx`

Currently, assistant block notifications are inserted into the `notifications` table but there is no type-specific rendering in the notification feed.

**What changes**:
- Create a small component that renders assistant block notification items with:
  - Accept/Decline action buttons (reusing `AssistantBlockActions`)
  - Time and date context
  - Requester name
- This component is used when `notification.type === 'assistant_time_block'`

**File**: Find and update the notification rendering component to detect `type === 'assistant_time_block'` and render `AssistantBlockNotificationItem` instead of the default text-only layout.

---

## Change 5: Auto-Notify Unassigned Block Pool

**File**: `src/hooks/useAssistantTimeBlocks.ts`

When a block is created with `assistant_user_id: null`, no notification is sent to anyone. Assistants scheduled at that location should receive a notification.

**What changes**:
- In the `createBlock` mutation's success path, when `assistant_user_id` is null:
  - Query `useAssistantsAtLocation` data (or call the query inline) to find assistants working at the location on that date
  - Insert a notification for each of them: "An assistant coverage request is available for [date] [time range]"
  - Metadata includes `time_block_id` so the notification action buttons work

---

## Change 6: Stale Block Cleanup Indicator

**File**: `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx`

Blocks older than today with status `requested` are stale. While the pending badge now filters them out (gap fix), the manager sheet still shows them in the 30-day window with no visual distinction.

**What changes**:
- In `BlockRow`, check if `block.date < todayStr` and `block.status === 'requested'`
- If true, add a subtle "Expired" badge next to the status and dim the row
- Add a "Clear expired" bulk action button at the top of the "My Requests" tab that deletes all past unconfirmed blocks

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/hooks/useAssistantTimeBlocks.ts` | Add realtime subscription; add pool notification on unassigned block creation |
| `src/components/dashboard/schedule/RequestAssistantPanel.tsx` | Integrate availability-aware picker with conflict indicators |
| `src/components/dashboard/schedule/QuickBookingPopover.tsx` | Add availability info when assistant toggle is enabled |
| `src/components/dashboard/schedule/AssistantBlockNotificationItem.tsx` | New: notification item renderer with action buttons |
| `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx` | Add expired block indicator and bulk cleanup |
| Notification feed component (to be identified) | Route `assistant_time_block` type to new renderer |

### What This Does NOT Do (Deferred)

- No push notifications or email alerts (remains in-app only)
- No auto-assignment algorithm
- No drag-to-resize time blocks on the calendar
- No assistant utilization analytics/reporting
