

# Draft Appointments System

## Overview

When a user starts building an appointment in the booking wizard but closes it before confirming, the in-progress data is automatically saved as a "draft." Drafts can be recalled later to resume and finalize the booking. This eliminates lost work when a client changes their mind or the front desk gets interrupted.

## How It Works

1. **Auto-save on close**: When the booking popover/panel is dismissed without completing the booking, any partially filled data (service, client, stylist, location, date/time, notes) is saved to a `draft_bookings` table.
2. **Draft indicator**: A small badge/button on the schedule header (near the existing action buttons) shows the count of active drafts. Clicking it opens a searchable list.
3. **Recall a draft**: Selecting a draft re-opens the booking wizard pre-populated with all saved data, jumping to the furthest step reached.
4. **Drafts expire**: Drafts older than 7 days are automatically cleaned up (soft-deleted).
5. **Draft is deleted on booking**: When a draft is successfully booked, its record is removed.

## Technical Details

### 1. Database: `draft_bookings` table

New table with RLS scoped to organization members:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| organization_id | uuid (FK) | Tenant scope |
| location_id | text | |
| created_by | uuid | auth.uid() of the person who started it |
| appointment_date | date | |
| start_time | time | |
| client_id | uuid | Nullable -- client may not be selected yet |
| client_name | text | Denormalized for search |
| staff_user_id | uuid | Nullable |
| staff_name | text | Denormalized |
| selected_services | jsonb | Array of service IDs + names |
| notes | text | |
| step_reached | text | Last wizard step reached (service/location/client/stylist/confirm) |
| is_redo | boolean | false default |
| redo_metadata | jsonb | Redo reason, original appointment, etc. |
| expires_at | timestamptz | created_at + 7 days |
| created_at | timestamptz | |

RLS: `is_org_member(auth.uid(), organization_id)` for SELECT/INSERT/UPDATE/DELETE.

### 2. Hook: `useDraftBookings`

New file: `src/hooks/useDraftBookings.ts`

- `useDraftBookings(orgId)` -- fetches active (non-expired) drafts, ordered by most recent
- `useSaveDraft()` -- mutation to upsert a draft
- `useDeleteDraft()` -- mutation to remove a draft (on successful booking or manual discard)
- Query key: `['draft-bookings', orgId]`
- Search filtering done client-side (drafts are low volume)

### 3. Component: `DraftBookingsSheet`

New file: `src/components/dashboard/schedule/DraftBookingsSheet.tsx`

- Slide-out sheet triggered from a button in ScheduleHeader
- Shows list of drafts with: client name (or "No client"), service names, date/time, stylist, how long ago it was created
- Search input filters by client name, service name, or stylist name
- Each draft has "Resume" and "Discard" actions
- "Resume" opens QuickBookingPopover pre-populated with draft data
- "Discard" deletes the draft with confirmation

### 4. Changes to `QuickBookingPopover`

- Accept optional `draftId` and `initialDraftData` props
- On mount with draft data: pre-populate all state fields and jump to the appropriate step
- On `handleClose` (dismiss without booking): if any meaningful data exists (at least one service or client selected), auto-save as draft via `useSaveDraft`
- On successful booking (`onSuccess`): if `draftId` is set, delete the draft
- Add a toast: "Booking saved as draft" when auto-saving on close

### 5. Changes to `ScheduleHeader`

- Add a "Drafts" button with a badge showing count of active drafts
- Clicking opens `DraftBookingsSheet`

### 6. Changes to Schedule page

- Pass draft-resume handler that opens the booking panel pre-populated with draft data

## File Summary

| Action | File |
|--------|------|
| Create | Migration SQL for `draft_bookings` table + RLS |
| Create | `src/hooks/useDraftBookings.ts` |
| Create | `src/components/dashboard/schedule/DraftBookingsSheet.tsx` |
| Modify | `src/components/dashboard/schedule/QuickBookingPopover.tsx` (draft props, auto-save on close, delete on book) |
| Modify | `src/components/dashboard/schedule/ScheduleHeader.tsx` (drafts button + badge) |
| Modify | `src/pages/dashboard/Schedule.tsx` (wire draft resume flow) |

