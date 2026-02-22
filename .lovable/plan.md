

# Enhance Draft Bookings: Group by Client + "Most Recent" Badge + UX Improvements

## What Changes

### 1. Group drafts by client
Instead of a flat list, drafts are grouped under collapsible client headers. Clients with no name selected group under "No Client Selected." Within each group, drafts are sorted newest-first.

### 2. "Most Recent" badge
The newest draft per client gets a small "Most Recent" badge (using the existing Badge component with `variant="secondary"`). This makes it immediately clear which version to resume.

### 3. Wizard step progress indicator
Each draft card shows a minimal step progress bar (dots or small text like "Service > Client > Stylist") so staff can see at a glance how far the draft got. Uses the existing `STEPS` array from QuickBookingPopover.

### 4. Created-by attribution
Show who started the draft (small "by [name]" text) by joining on `employee_profiles` via `created_by`. This helps in multi-staff handoff scenarios.

### 5. "Discard All" per client group
When a client has 2+ drafts, a small "Discard All" link appears in the group header for fast cleanup.

### 6. Draft count per client in group header
Each client group header shows "(3 drafts)" count so the list is scannable.

## Technical Details

### DraftBookingsSheet.tsx (modify)
- Group `filtered` drafts into a `Map<string, DraftBooking[]>` keyed by `client_name || 'No Client Selected'`
- Render each group with a collapsible header (using Collapsible from Radix) showing client name + draft count
- First item in each group (already sorted newest-first from the query) gets a "Most Recent" Badge
- Add "Discard All" button per group header when group has 2+ drafts
- Add step progress indicator per card (map `step_reached` against the known steps array to show filled/unfilled dots)

### useDraftBookings.ts (modify)
- Update the query to also select `created_by` profile info via a join or separate lookup
- Add `created_by_name` to the `DraftBooking` interface
- Update the query: `.select('*, creator:employee_profiles!draft_bookings_created_by_fkey(display_name, full_name)')` (or use a separate lightweight lookup if FK isn't registered)

### useDeleteDraft hook (modify)
- Add a `useDeleteDraftsForClient` mutation (or extend existing) that accepts an array of draft IDs for batch delete

### Database
- No schema changes needed -- all data is already present (`created_by`, `step_reached`, `client_name`, `created_at`)
- The `created_by` FK to `auth.users` exists but we need employee_profiles join. Since there's no direct FK from `draft_bookings.created_by` to `employee_profiles.user_id`, we'll do a client-side lookup or add a denormalized `created_by_name` column

### Option: Add `created_by_name` column (simpler)
- Migration: `ALTER TABLE draft_bookings ADD COLUMN created_by_name TEXT;`
- Populate it at save time in `useSaveDraft` from the current user's profile
- Avoids join complexity

## File Summary

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/DraftBookingsSheet.tsx` -- grouped layout, most-recent badge, step progress, discard-all, created-by display |
| Modify | `src/hooks/useDraftBookings.ts` -- add `created_by_name` to interface, batch delete mutation, populate `created_by_name` on save |
| Migration | Add `created_by_name` column to `draft_bookings` |

