
# Show Duplicate Clients in Directory with Merge Prompts

## Problem
Duplicate clients are currently hidden from the directory via `.eq('is_duplicate', false)`. This silently removes records, confusing salon staff who can't find clients they know exist. Duplicates should be visible but clearly flagged with inline merge functionality.

## Approach
Remove the duplicate filter from the directory query. Instead, show duplicate clients with a visual "Duplicate" badge and an inline prompt to merge them with their canonical (original) record.

## Changes

### 1. ClientDirectory.tsx -- Remove duplicate filter from query
- **Line 141**: Remove `.eq('is_duplicate', false)` so all clients (including duplicates) are fetched.
- Update the query `select` to include `is_duplicate` and `canonical_client_id` (already in the `*` select).

### 2. ClientDirectory.tsx -- Add "Duplicates" tab filter
- Add a new tab alongside VIP, At Risk, New, Banned, Archived:
  - "Duplicates (N)" -- filters to only `is_duplicate === true` clients
- Add a `duplicates` count to the `stats` object.
- Add a stats card showing the duplicate count (amber/orange styling, GitMerge icon).

### 3. ClientDirectory.tsx -- Duplicate badge on client rows
- In the client row (around line 734), add a "Duplicate" badge when `client.is_duplicate === true`:
  - Badge: amber styling with GitMerge icon, text "Duplicate"
  - Sits alongside VIP, At Risk, New badges

### 4. ClientDirectory.tsx -- Inline merge prompt for duplicate rows
- For duplicate clients, replace the generic merge icon button with a more prominent "Merge" button:
  - If `canonical_client_id` exists, the merge button navigates to the merge wizard pre-populated with both the duplicate and canonical client IDs
  - Tooltip: "This client matches an existing profile. Merge to consolidate."

### 5. Other query locations -- Keep duplicate filter
- Analytics hooks (`useClientHealthSegments`, `useClientRetentionReport`, `useQuickStats`, `useOrganizationAnalytics`), booking search (`QuickBookingPopover`, `BookingWizard`), kiosk, re-engagement, and the POS adapter should continue filtering out duplicates with `.eq('is_duplicate', false)` since those surfaces need deduplicated data for accuracy.

## Technical Details

| File | Change |
|---|---|
| `src/pages/dashboard/ClientDirectory.tsx` (line 141) | Remove `.eq('is_duplicate', false)` |
| `src/pages/dashboard/ClientDirectory.tsx` (stats) | Add `duplicates` count from `is_duplicate` field |
| `src/pages/dashboard/ClientDirectory.tsx` (tabs) | Add "Duplicates" tab trigger with count badge |
| `src/pages/dashboard/ClientDirectory.tsx` (row) | Add amber "Duplicate" badge + prominent merge CTA with canonical linking |
| No other files affected | Analytics/booking queries keep their duplicate filter |

## What stays the same
- All analytics, booking, kiosk, and campaign hooks continue excluding duplicates (correct for those contexts)
- The merge wizard, audit log, and undo functionality remain unchanged
- The `is_duplicate` flag is still set during POS sync as before
