

## Add "Create New Client" to Dock Booking Flow

### Problem
When a walk-in client is brand new, the stylist has no way to create them from the Dock. They can only search existing clients. Need a "New Client" option that creates the client in the directory and then selects them for the booking.

### Approach
Create a new `DockNewClientSheet` component — a platform-themed bottom sheet (matching the Dock's dark theme) that collects the essential fields for a walk-in: first name, last name, phone, email, and optional gender. It reuses the same backend logic as the dashboard's `NewClientDialog` (Phorest edge function when branch exists, direct `clients` table insert as fallback), plus duplicate detection.

### Changes

**1. New file: `src/components/dock/schedule/DockNewClientSheet.tsx`**
- A bottom sheet (same `motion.div` pattern as `DockNewBookingSheet`) with platform-themed inputs
- Minimal fields for a walk-in: First Name, Last Name, Phone, Email, Gender (pill toggles)
- Uses `useDuplicateDetection` hook for real-time duplicate checking
- On submit: calls `create-phorest-client` edge function (if location has `phorest_branch_id`) or inserts directly into `clients` table
- On success: calls `onClientCreated` callback with the new client shaped as `PhorestClient` so it slots right into the booking wizard
- Shows a simplified duplicate warning inline (not full modal) — "Possible match found: Jane Doe" with "Use Existing" / "Create Anyway" buttons

**2. Update `DockNewBookingSheet.tsx` — `ClientStepDock`**
- Add a `+ New Client` button below the search input (or in the empty/no-results state)
- Wire it to open `DockNewClientSheet`
- On client created, auto-select and advance to the service step
- Add `onCreateNewClient` callback prop and state management in the parent

### Technical details

| Aspect | Detail |
|--------|--------|
| Client creation | Same mutation as `NewClientDialog`: edge function `create-phorest-client` for Phorest branches, direct `clients` table insert otherwise |
| Duplicate detection | `useDuplicateDetection(debouncedEmail, debouncedPhone)` — shows inline warning if matches found |
| Location | Auto-set from `locationId` prop (Dock is location-locked) — no location selector needed |
| Organization | From `staff.organizationId` via `DockDemoContext` |
| Styling | Platform tokens (`--platform-input`, `--platform-border`, etc.), `PlatformInput` for fields |
| Animation | Same spring physics as booking sheet for consistency |

