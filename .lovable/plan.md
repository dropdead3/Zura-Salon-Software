

## Add Unified Customer ID (ZU-XXXXX) to All Clients

### Problem

Neither `clients` nor `phorest_clients` tables have a unified, human-readable customer ID. The `external_client_id` field on `phorest_clients` is empty for all 3,160 records, and `external_id` on `clients` is populated only for imports (504 of 505). There is no auto-assignment on creation or import.

### Solution

Add a `customer_number` column with a database sequence that auto-generates `ZU-00001`, `ZU-00002`, etc. for every client -- on both manual creation and Phorest sync/import. This provides a single, human-readable, org-independent identifier operators can use to distinguish same-name clients.

### Database Changes

#### 1. Create sequence + columns + trigger

- Add a new sequence: `client_customer_number_seq`
- Add `customer_number TEXT` column to both `clients` and `phorest_clients` tables with a unique constraint
- Create a trigger function `generate_customer_number()` that fires BEFORE INSERT on both tables and sets `customer_number = 'ZU-' || lpad(nextval('client_customer_number_seq')::text, 5, '0')` (shared sequence ensures no collisions across tables)
- Add an index on `customer_number` for fast lookups

#### 2. Backfill existing records

- Backfill all 3,160 `phorest_clients` records ordered by `created_at`
- Backfill all 505 `clients` records ordered by `created_at`
- This ensures existing clients get sequential IDs reflecting their creation order

```text
Migration 1 (schema): sequence + columns + triggers + indexes
Migration 2 (data): backfill existing records
```

### Code Changes

#### 3. Edge Function: create-phorest-client (supabase/functions/create-phorest-client/index.ts)

No change needed -- the trigger auto-assigns `customer_number` on INSERT. The function already does `.select()` after insert, so the returned record will include the new field.

#### 4. NewClientDialog (src/components/dashboard/schedule/NewClientDialog.tsx)

No change needed for the local `clients` insert -- same trigger logic applies. The `.select()` call after insert will include `customer_number`.

#### 5. AppointmentDetailDrawer -- Show Customer Number

Update the Client ID display (added in the previous batch action guard) to prefer `customer_number` over raw UUIDs. Display format: `ZU-00042` with copy-to-clipboard.

#### 6. ClientDetailSheet -- Show Customer Number

Add a "Customer ID" badge near the client name in the header section, displaying the `ZU-XXXXX` value. This makes it instantly visible when operators open a client profile.

#### 7. AppointmentBatchBar -- Use Customer Number in Warning

Update the multi-client warning to reference customer numbers when available, so operators can see exactly which clients are affected (e.g., "Includes ZU-00042 and ZU-00089").

### Technical Details

**Sequence design:**
- Single shared sequence across both `clients` and `phorest_clients` tables prevents ID collisions
- Format: `ZU-` prefix + zero-padded 5-digit number (supports up to 99,999 before rolling to 6 digits naturally)
- Trigger-based: no application code needed for assignment -- any INSERT path (edge function, direct SQL, sync job) automatically gets a customer number

**Data flow:**
```text
Any INSERT into clients or phorest_clients
  --> BEFORE INSERT trigger fires
  --> nextval('client_customer_number_seq') generates next number
  --> customer_number = 'ZU-00001' (auto-assigned)
```

**Query pattern for resolving customer numbers in appointments:**
- `phorest_appointments` already join to `phorest_clients` via `phorest_client_id` -- add `customer_number` to the select
- `appointments` already have `client_id` FK -- join to `clients` for `customer_number`
- The `useAppointmentsHub` hook will be updated to include `customer_number` in the enrichment step

### Files Modified

- **New migration SQL** -- sequence, columns, triggers, indexes, backfill
- `supabase/functions/create-phorest-client/index.ts` -- no changes needed (trigger handles it)
- `src/hooks/useAppointmentsHub.ts` -- include `customer_number` in client info resolution
- `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` -- display `customer_number` instead of raw UUID
- `src/components/dashboard/appointments-hub/AppointmentBatchBar.tsx` -- reference customer numbers in multi-client warning
- `src/components/dashboard/ClientDetailSheet.tsx` -- display customer number badge in header

### What Does NOT Change

- No changes to RLS policies (new column inherits existing row-level policies)
- No changes to existing client creation flows (trigger handles everything)
- No changes to Phorest sync (sync inserts into `phorest_clients`, trigger auto-assigns)
- Existing `external_id` and `external_client_id` fields remain untouched

