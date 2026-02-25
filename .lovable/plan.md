

## Phorest Detachment: Full Standalone Migration Plan

Yes, this is absolutely doable. The architecture is already partially there -- you have native `appointments`, `clients`, and `services` tables with the right columns. What's missing is: (1) native transaction tables, (2) a data migration to copy all Phorest data into native tables, and (3) redirecting ~130 files from `phorest_*` queries to native tables.

Here's the current state and the full plan.

### Current Data Inventory

| Table | Phorest Rows | Native Rows | Gap |
|---|---|---|---|
| Appointments | 584 | 127 | Native exists, needs migration + column parity |
| Clients | 3,166 | 505 | Native exists, needs migration + column parity |
| Services | (phorest_services) | services table exists | Need data migration |
| Transaction Items | 771 | **No native table** | Must create schema |
| Daily Sales Summary | phorest_daily_sales_summary | **No native table** | Must create schema |
| Staff Mapping | phorest_staff_mapping | employee_profiles | Staff identity already native via user_id |

### Architecture: How It Will Work

```text
┌─────────────────────────────────────┐
│         Feature Code (hooks/UI)      │
│  Queries ONLY native tables:         │
│  appointments, clients, services,    │
│  transaction_items, daily_sales      │
└──────────────┬───────────────────────┘
               │
    ┌──────────▼──────────────┐
    │    Native Zura Tables    │
    │  (source of truth)       │
    └──────────▲──────────────┘
               │
    ┌──────────┴──────────────┐
    │  Phorest Sync Adapter    │  ← Optional integration
    │  Writes INTO native      │     that can be disconnected
    │  tables via sync jobs    │     without losing data
    └─────────────────────────┘
```

When Phorest is connected, sync jobs populate/update native tables. When disconnected, native tables retain all data and the platform runs standalone.

### Phase 1: Schema Completion (New Tables + Column Alignment)

**1a. Create `transaction_items` table** (native equivalent of `phorest_transaction_items`):
- All columns from `phorest_transaction_items` mapped to native equivalents
- `organization_id` for RLS scoping
- `external_id` + `import_source` for provenance tracking
- `staff_user_id` (UUID) instead of `phorest_staff_id` (text)
- `client_id` (UUID FK to `clients`) instead of `phorest_client_id` (text)
- RLS policies for org members

**1b. Create `daily_sales_summary` table** (native equivalent of `phorest_daily_sales_summary`):
- `organization_id`, `location_id`, `summary_date`
- Revenue breakdowns, transaction counts
- RLS policies

**1c. Align native table columns** -- add missing columns to existing native tables:
- `appointments`: add `phorest_client_id`, `phorest_staff_id`, `phorest_id`, `is_new_client`, `rebook_declined_reason`, `rescheduled_from_date`, `rescheduled_from_time`, `rescheduled_at`, `created_by`, `recurrence_rule`, `recurrence_group_id`, `recurrence_index` (columns present in phorest_appointments but missing from native)
- `clients`: add `referred_by`, `client_category`, `prompt_client_notes`, `prompt_appointment_notes`, `is_banned`, `ban_reason`, `banned_at`, `banned_by`, `is_archived`, `archived_at`, `archived_by`, `preferred_services`, `branch_name` (columns in phorest_clients not yet in native)
- `services`: add `phorest_service_id`, `phorest_branch_id` for external ID tracking (some already have `external_id`)

### Phase 2: Data Migration (One-Time Copy)

A database function + edge function that:

1. **Migrates phorest_appointments → appointments**: Copies all 584 records, deduplicating against the 127 already in native (matching on `external_id` = `phorest_id` or date+time+client composite key). Sets `import_source = 'phorest'`, `external_id = phorest_id`.

2. **Migrates phorest_clients → clients**: Copies all 3,166 records, deduplicating against the 505 already native (matching on `phorest_client_id` or email/phone normalized). Maps `phorest_client_id` to `clients.phorest_client_id` for backward compatibility.

3. **Migrates phorest_services → services**: Copies active services, deduplicating on name + category. Sets `external_id = phorest_service_id`.

4. **Migrates phorest_transaction_items → transaction_items**: Copies all 771 records, resolving `phorest_staff_id` → `staff_user_id` via `phorest_staff_mapping`, and `phorest_client_id` → `client_id` via the client migration mapping.

5. **Migrates phorest_daily_sales_summary → daily_sales_summary**: Direct copy with org scoping.

6. **Staff identity resolution**: `phorest_staff_mapping` becomes a lookup table only. All migrated records use `staff_user_id` (the native employee_profiles UUID) directly. After migration, no feature code needs `phorest_staff_mapping`.

### Phase 3: Hook Migration (Redirect Queries)

This is the largest phase -- redirecting ~130 files. Organized by domain:

**3a. Appointments Domain (~76 files)**
- All hooks querying `phorest_appointments` redirect to `appointments`
- Column names are nearly identical; main change is removing `phorest_` prefix references
- `phorest_client_id` lookups change to `client_id` (UUID FK)
- `phorest_staff_id` lookups change to `staff_user_id` (already exists on native table)

Key files: `useTodaysQueue`, `useCalendar`, `useAppointmentsHub`, `useOperationalAnalytics`, `useLiveSessionSnapshot`, `AppointmentDetailSheet`, `Schedule.tsx`

**3b. Clients Domain (~37 files)**
- All hooks querying `phorest_clients` redirect to `clients`
- `phorest_client_id` becomes `external_id` or `phorest_client_id` (kept as optional column for backward compat)
- `name` (single field) → `first_name` + `last_name` with computed `name`
- Client detail sheets, directory, engagement hooks all redirect

Key files: `ClientDetailSheet`, `ClientDirectory`, `useClientEngagement`, `useClientExperience`, `useTipsDrilldown`

**3c. Transactions/Sales Domain (~16 files)**
- All hooks querying `phorest_transaction_items` redirect to `transaction_items`
- `phorest_staff_id` → `staff_user_id`, `phorest_client_id` → `client_id`
- Staff name resolution uses `employee_profiles` directly (no more `phorest_staff_mapping` joins)

Key files: `useSalesData`, `useRetailAnalytics`, `useTransactions`, `useProductSalesAnalytics`, `useAppointmentTransactionBreakdown`

**3d. Services Domain (~14 files)**
- All hooks querying `phorest_services` redirect to `services`
- Column names align closely; `phorest_service_id` → `external_id`

Key files: `usePhorestServices` → rename to `useServices`, `useServiceLookup`, `useServiceEfficiency`

**3e. Staff Identity (~37 files)**
- All `phorest_staff_mapping` joins eliminated
- Direct query to `employee_profiles` for staff name/identity
- This is the most cross-cutting change but also the simplest -- replace a 2-table join with a single-table query

### Phase 4: Sync Adapter Update

Update the Phorest sync functions to write INTO native tables instead of `phorest_*` tables:
- `sync-phorest-data` → writes to `appointments`, `clients`, `services`, `transaction_items`
- Sets `import_source = 'phorest'` and `external_id` for deduplication
- When Phorest is disconnected, sync simply stops -- data persists in native tables

The `phorest_*` tables become staging/archive tables that can eventually be dropped.

### Phase 5: Cleanup

- Remove or deprecate `phorest_*` table direct queries from all feature code
- `phorest_staff_mapping` becomes optional (only needed during active Phorest connection for ID resolution)
- Phorest settings UI gets a "Disconnect" action that disables sync without data loss
- POS adapter interface updated to read from native tables (becomes a thin wrapper)

### Execution Order (Recommended)

| Step | What | Files Affected | Risk |
|---|---|---|---|
| 1 | Create native `transaction_items` + `daily_sales_summary` | DB migration only | Low |
| 2 | Add missing columns to `appointments`, `clients` | DB migration only | Low |
| 3 | Run data migration (copy phorest_* → native) | Edge function + DB function | Medium -- needs dedup logic |
| 4 | Migrate staff identity queries (drop `phorest_staff_mapping` joins) | ~37 files | Medium |
| 5 | Migrate appointments hooks | ~76 files | High -- core scheduling |
| 6 | Migrate clients hooks | ~37 files | Medium |
| 7 | Migrate transactions/sales hooks | ~16 files | Medium |
| 8 | Migrate services hooks | ~14 files | Low |
| 9 | Update Phorest sync to write to native tables | ~5 edge functions | Medium |
| 10 | End-to-end testing | All surfaces | Critical |

### What This Means for You

After this migration:
- **Disconnect Phorest → nothing breaks.** All data lives in native Zura tables.
- **Reconnect Phorest later → sync resumes.** It writes into native tables using `external_id` dedup.
- **Connect a different POS → same pattern.** The adapter writes to native tables.
- **All analytics, history, transactions, reviews → preserved.** They query native tables.

This is a substantial migration (~130 files + schema work + data migration), but the architecture supports it. The native tables already exist for appointments, clients, and services -- we're completing the picture with transactions and doing the query redirect.

### Recommended Approach

Given the scope, I recommend we execute this in batches:
1. **Start with schema + data migration** (Steps 1-3) -- no feature code changes yet, just ensure all data exists in native tables
2. **Then migrate by domain**, starting with staff identity (most cross-cutting, unblocks everything else)
3. **Test each domain** before moving to the next

Shall I begin with Step 1 (schema creation) and Step 3 (data migration function)?

