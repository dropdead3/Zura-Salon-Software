

## Consolidate Notes & Surface Appointment Notes on Services Tab

### Current state
- **Services tab**: Shows allergy banner + profile notes (from client record)
- **Notes tab**: Shows only `appointment.notes` (single text field from scheduling)
- **`appointment_notes` table**: Threaded notes with authors — exists but NOT shown in Dock

### Plan

**1. Redesign the Notes tab — show everything**

Update `DockNotesTab.tsx` to consolidate three note sources:

- **Appointment note** (from `appointment.notes`) — labeled "Booking Note", shown in a muted card with a `CalendarPlus` icon. Read-only. This is what the receptionist added at scheduling time.
- **Profile notes** (from client record) — labeled "Profile Notes", same query as the banner. Read-only here too.
- **Threaded appointment notes** (from `appointment_notes` table via `useAppointmentNotes`) — labeled "Team Notes", with author avatars, timestamps, and an input to add new notes. This is the interactive section.

Each section gets a `DOCK_TEXT.category` label. Empty sections are omitted.

**2. Update Services tab banner — add booking note**

Update `DockClientAlertsBanner.tsx` to also accept and display `appointment.notes` (the scheduling/booking note). Add a new compact card between allergies and profile notes, styled with a `CalendarPlus` icon and "Booking Note" label. This ensures stylists see receptionist reminders before mixing.

### Files to change

**`src/components/dock/appointment/DockNotesTab.tsx`** — Major rewrite:
- Import `useAppointmentNotes` hook + `useQuery` for client profile
- Add the three sections (Booking Note, Profile Notes, Team Notes)
- Add input form for new team notes at the top
- Accept additional props: `clientId`, `phorestClientId`, `clientName`

**`src/components/dock/appointment/DockClientAlertsBanner.tsx`**:
- Accept new `bookingNotes` prop (the `appointment.notes` string)
- Render a compact card for booking notes between allergy and profile sections

**`src/components/dock/appointment/DockAppointmentDetail.tsx`**:
- Pass `appointment.client_id`, `appointment.phorest_client_id`, and `appointment.client_name` to `DockNotesTab`
- Pass `appointment.notes` to `DockClientAlertsBanner` via `DockServicesTab`

**`src/components/dock/appointment/DockServicesTab.tsx`**:
- Pass `appointment.notes` through to `DockClientAlertsBanner` as `bookingNotes`

### Result
- Notes tab becomes the single hub for all note types
- Services tab surfaces booking notes (receptionist reminders) alongside allergies and profile notes
- Team notes are finally visible and interactive in the Dock

