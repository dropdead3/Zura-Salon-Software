
## Enrich Appointments Hub with Full Contact and Booking Metadata

### What Changes

The Appointments Hub table and detail drawer will be expanded to show significantly more data about each appointment, including client contact info, booking provenance, and confirmation details.

### 1. Expand Data Enrichment in useAppointmentsHub.ts

The client name resolution query already fetches from `phorest_clients` -- we will expand it to also pull `email`, `phone`, and other contact fields. We will also resolve `created_by` user IDs to names, and resolve `location_id` to location names.

**Updated phorest_clients fetch** (line 93):
- Change `.select('phorest_client_id, name')` to `.select('phorest_client_id, name, email, phone')`
- Build a full `clientInfoMap` instead of just `clientNameMap` so we can attach email and phone

**Resolve created_by names**: Collect all unique `created_by` user IDs from paged results, batch-query `employee_profiles` to get names, and attach as `created_by_name`.

**Resolve location names**: Build a location map from `location_id` values present in paged results by querying the `locations` table, attach as `location_name`.

**Enrichment output** will add these fields to each appointment:
- `client_email` -- from `phorest_clients.email` or local `appointments.client_email`
- `client_phone` -- already exists on `phorest_appointments`, fallback from `phorest_clients.phone`
- `created_by_name` -- resolved from `employee_profiles` via `created_by` field
- `location_name` -- resolved from `locations` table
- `created_at` -- already present from both tables (no change needed)

### 2. Add Columns to the Table (AppointmentsList.tsx)

Add new visible columns to the table:

| Column | Source | Notes |
|--------|--------|-------|
| Phone | `client_phone` | Formatted for display |
| Email | `client_email` | Truncated with tooltip if long |
| Created | `created_at` | Formatted as "Feb 22, 2:15 PM" |
| Created By | `created_by_name` | Falls back to "System" or "Phorest Sync" based on `_source` |

The table will go from 7 columns to 11. To manage width, the Email column will truncate with `max-w-[160px]`.

Update CSV export headers to include the new fields.

### 3. Expand the Detail Drawer (AppointmentDetailDrawer.tsx)

The Summary tab will be restructured into clear sections:

**Client Info Section:**
- Client name (existing)
- Phone number (clickable `tel:` link)
- Email (clickable `mailto:` link)

**Appointment Details Section** (existing, enhanced):
- Date, time, stylist, location (existing)
- Price and tip (existing)

**Booking Provenance Section** (new):
- "Created at" timestamp with full date/time
- "Created by" name (or "Phorest Sync" / "Online Booking" based on source)
- "Source" badge showing `_source` (phorest vs local) and `import_source` if available
- Payment method (if set)

**Confirmation Details Section** (new):
- Status with badge (existing, moved here)
- Confirmation method -- derived from audit log if available, otherwise shows "Pending" or the status change context
- "Confirmed at" timestamp -- from audit log `status_changed` event where new status = confirmed

For confirmation details, we will query the `appointment_audit_log` for the specific appointment in the drawer (already done via `AppointmentAuditTimeline`), but we will also extract the confirmation event specifically to show it inline in the summary.

### 4. Add Confirmation Metadata Hook

Create a small helper within the drawer that queries `appointment_audit_log` for the `status_changed` event where `new_value.status = 'confirmed'` to extract:
- When confirmed (`created_at` of that audit entry)
- Who confirmed it (`actor_name`)
- This serves as the "method of confirmation" -- if `actor_name` is "System" it was auto-confirmed, if it is a person's name it was manual confirmation

### Technical Details

**Files modified:**
- `src/hooks/useAppointmentsHub.ts` -- Expand client info resolution, add created_by and location name resolution
- `src/components/dashboard/appointments-hub/AppointmentsList.tsx` -- Add Phone, Email, Created, Created By columns; update CSV export
- `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` -- Add Client Info section with phone/email, Booking Provenance section, Confirmation Details section with audit log lookup

**No database changes needed** -- all required data already exists in `phorest_appointments`, `appointments`, `phorest_clients`, `employee_profiles`, `locations`, and `appointment_audit_log` tables.
