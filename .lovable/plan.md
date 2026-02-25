

## Phase 2: Data Migration Edge Function (Option B -- NULL staff_user_id)

This builds the `migrate-phorest-data` edge function that copies all Phorest data into native Zura tables, with dry-run mode, rollback tagging, and NULL staff attribution for the 19 unmapped staff.

### What Gets Built

A single edge function (`supabase/functions/migrate-phorest-data/index.ts`) that:

1. Accepts `{ dry_run: boolean }` parameter (defaults to `true` for safety)
2. Migrates 5 domains in dependency order: Clients → Services → Appointments → Transactions → Daily Sales
3. Tags all migrated records with `import_source = 'phorest_migration'`
4. Returns detailed counts per domain (inserted, skipped/deduped, errors)

### Migration Logic Per Domain

**Clients (3,166 → native `clients`)**
- First pass: backfill `phorest_client_id` on existing 505 native clients by matching `email_normalized` (410 matches expected)
- Second pass: INSERT remaining Phorest clients that have no match, splitting `name` → `first_name` + `last_name`
- Dedup key: `email_normalized`, then `phone_normalized`
- All get `organization_id = 'fa23cd95-...'`, `import_source = 'phorest_migration'`
- Builds a `phorest_client_id → clients.id` mapping table in memory for downstream use

**Services (phorest_services → native `services`)**
- Dedup by `name + category + location_id` (via phorest_branch_id → location mapping)
- Sets `external_id = phorest_service_id`, `import_source = 'phorest_migration'`

**Appointments (584 → native `appointments`)**
- 127 already have `external_id` matching `phorest_id` -- skip those
- Remaining ~457: INSERT with `external_id = phorest_id`
- `staff_user_id`: resolve via the 2 mapped staff entries; NULL for the 19 unmapped (preserve `phorest_staff_id` as text)
- `client_id`: resolve via the client mapping built in step 1
- `organization_id`: resolve via `location_id → locations.organization_id`

**Transaction Items (771 → native `transaction_items`)**
- Dedup by `transaction_id` (external_id)
- `staff_user_id`: same 2-entry resolution; NULL + `phorest_staff_id` preserved in `staff_name` for the rest
- `client_id`: resolve via client mapping
- `organization_id`: resolve via location

**Daily Sales Summary → native `daily_sales_summary`**
- Direct copy with `organization_id` resolved via location
- `staff_user_id`: resolve where possible, NULL otherwise
- `external_id` = composite key (`location_id + date + phorest_staff_id`)

### Safety Features

- **Dry-run mode** (default): Runs all queries as SELECTs, returns exact counts of what would be inserted/skipped/errored without touching data
- **Rollback tag**: All records tagged `import_source = 'phorest_migration'` -- a single DELETE WHERE import_source = 'phorest_migration' rolls back everything
- **Batch processing**: Processes in batches of 200 to avoid timeouts
- **Idempotent**: Running twice won't create duplicates (dedup on external_id/phorest_client_id)

### Config.toml Addition

```toml
[functions.migrate-phorest-data]
verify_jwt = false
```

### Technical Details

- Single file: `supabase/functions/migrate-phorest-data/index.ts`
- Auth required (checks for admin/platform role)
- Organization ID: resolved from locations table, not hardcoded
- Staff mapping: queries `phorest_staff_mapping` once at start, builds in-memory lookup `{ phorest_staff_id → user_id }`
- Client mapping: built during client migration step, stored as `Map<string, string>` (phorest_client_id → native client UUID)
- Branch-to-location mapping: `phorest_branch_id → locations.id` built from locations table

### Response Format

```json
{
  "success": true,
  "dry_run": true,
  "results": {
    "clients": { "total": 3166, "inserted": 2756, "updated": 410, "skipped": 0, "errors": 0 },
    "services": { "total": 45, "inserted": 30, "skipped": 15, "errors": 0 },
    "appointments": { "total": 584, "inserted": 457, "skipped": 127, "errors": 0 },
    "transactions": { "total": 771, "inserted": 771, "skipped": 0, "errors": 0 },
    "daily_sales": { "total": 120, "inserted": 120, "skipped": 0, "errors": 0 }
  },
  "warnings": [
    "19 staff IDs unmapped - appointments will have NULL staff_user_id",
    "phorest_staff_id preserved as text for future backfill"
  ]
}
```

