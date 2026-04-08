

# Phorest Detach — Make All Reports Standalone-Ready

## Problem

Every report hook directly queries `phorest_*` tables. When Phorest is disconnected, these tables will be empty — **all 14 report hooks and 3 report components with inline queries will return zero data**, making the entire reporting system non-functional.

Zura-native tables (`appointments`, `clients`, `transaction_items`) already exist with compatible schemas, and a union view `v_all_transaction_items` exists but is unused by any report.

## Strategy: Dual-Source Resolution

Rather than rewriting all 17 files to use the POS adapter (which is high-level and doesn't cover the raw queries these reports need), we use a **table resolution pattern**:

1. Create a shared utility `src/utils/dataSourceResolver.ts` that determines whether to query `phorest_*` tables, Zura-native tables, or both (union views)
2. For transaction items: use `v_all_transaction_items` (already exists as a union of both sources)
3. For appointments: create `v_all_appointments` union view
4. For clients: create `v_all_clients` union view  
5. For staff mapping: fall back gracefully when `phorest_staff_mapping` has no rows — use `employee_profiles` instead

This approach is minimally invasive: each hook swaps a table name reference, and the union views ensure historical Phorest data is still included if it exists.

## Database Migrations

### Migration 1: Create `v_all_appointments` union view

```sql
CREATE OR REPLACE VIEW public.v_all_appointments AS
SELECT 
  pa.id, pa.location_id, pa.phorest_staff_id,
  pa.staff_name, pa.phorest_client_id AS client_id,
  pa.client_name, pa.service_name, pa.appointment_date,
  pa.start_time, pa.end_time, pa.status,
  pa.total_price, pa.tip_amount, pa.rebooked_at_checkout,
  pa.is_new_client, pa.deleted_at, pa.deleted_by,
  pa.is_demo,
  'phorest' AS source
FROM phorest_appointments pa
UNION ALL
SELECT
  a.id::text, a.location_id, a.staff_user_id::text,
  a.staff_name, a.client_id::text,
  a.client_name, a.service_name, a.appointment_date::text,
  a.start_time::text, a.end_time::text, a.status,
  a.total_price, a.tip_amount, a.rebooked_at_checkout,
  a.is_new_client, a.deleted_at, a.deleted_by::text,
  false AS is_demo,
  COALESCE(a.import_source, 'zura') AS source
FROM appointments a;
```

### Migration 2: Create `v_all_clients` union view

```sql
CREATE OR REPLACE VIEW public.v_all_clients AS
SELECT
  pc.id, pc.phorest_client_id AS client_id,
  pc.name, pc.first_name, pc.last_name,
  pc.email, pc.email_normalized, pc.phone, pc.phone_normalized,
  pc.birthday, pc.total_spend, pc.visit_count,
  pc.last_visit AS last_visit_date, pc.lead_source,
  pc.is_archived, pc.is_duplicate, pc.canonical_client_id,
  pc.location_id, pc.created_at, pc.client_since,
  'phorest' AS source
FROM phorest_clients pc
UNION ALL
SELECT
  c.id::text, COALESCE(c.external_id, c.id::text),
  COALESCE(c.first_name || ' ' || c.last_name, 'Unknown'),
  c.first_name, c.last_name,
  c.email, c.email_normalized, c.mobile AS phone, c.phone_normalized,
  c.birthday, c.total_spend, c.visit_count,
  c.last_visit_date::text, c.lead_source,
  COALESCE(c.is_archived, false), false, NULL,
  c.location_id, c.created_at, c.client_since,
  COALESCE(c.import_source, 'zura') AS source
FROM clients c;
```

## Files to Modify

### Report hooks — swap `phorest_*` table to union view (14 files)

| File | `phorest_*` table used | Swap to |
|---|---|---|
| `useTopClientsReport.ts` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useCategoryMixReport.ts` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useDiscountsReport.ts` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useStaffTransactionDetailReport.ts` | `phorest_transaction_items` | `v_all_transaction_items` |
| `useTipAnalysisReport.ts` | `phorest_appointments` | `v_all_appointments` |
| `useFutureAppointmentsReport.ts` | `phorest_appointments` | `v_all_appointments` |
| `useCapacityReport.ts` | `phorest_appointments` | `v_all_appointments` |
| `useNoShowReport.ts` | `phorest_appointments` | `v_all_appointments` |
| `useClientAttritionReport.ts` | `phorest_appointments` | `v_all_appointments` |
| `useRebookingRate.ts` | `phorest_appointments` | `v_all_appointments` |
| `useClientRetentionReport.ts` | `phorest_clients` + `phorest_appointments` | `v_all_clients` + `v_all_appointments` |
| `useClientBirthdaysReport.ts` | `phorest_clients` | `v_all_clients` |
| `useDuplicateClientsReport.ts` | `phorest_clients` | `v_all_clients` |
| `useIndividualStaffReport.ts` | `phorest_staff_mapping` + `phorest_appointments` + `phorest_transaction_items` + `phorest_clients` | Union views + `employee_profiles` fallback |
| `useStaffKPIReport.ts` | `phorest_staff_mapping` + `phorest_appointments` + `phorest_transaction_items` | Union views + `employee_profiles` fallback |

### Report components with inline queries (3 files)

| File | Table | Swap to |
|---|---|---|
| `ClientSourceReport.tsx` | `phorest_clients` | `v_all_clients` |
| `DeletedAppointmentsReport.tsx` | `phorest_appointments` | `v_all_appointments` |
| `NoShowEnhancedReport.tsx` | `phorest_appointments` | `v_all_appointments` |

### Already standalone (no changes needed)

| File | Data source |
|---|---|
| `useGiftCardsReport.ts` | `gift_cards` (Zura-owned) |
| `useVouchersReport.ts` | `vouchers` (Zura-owned) |

### Staff mapping resolution

`useIndividualStaffReport.ts` and `useStaffKPIReport.ts` depend on `phorest_staff_mapping` to resolve `user_id → phorest_staff_id`. When Phorest is disconnected, this table will have no rows. The fix:

- Query `v_all_appointments` and `v_all_transaction_items` using `staff_user_id` (the Zura-native column) instead of `phorest_staff_id`
- Both union views already expose `staff_user_id` / `staff_name`
- Fall back to `employee_profiles` for staff name resolution

### New utility file

`src/utils/dataSourceResolver.ts` — exports table name constants and a helper to check if Phorest data exists. Not strictly required for the table swap approach, but useful for future conditional logic.

## Column Mapping Notes

The union views normalize column names. Key mappings:
- `phorest_client_id` → `client_id` (in union views)
- `phorest_staff_id` → `staff_user_id` (in union views, maps to `employee_profiles.user_id`)
- `stylist_user_id` → `staff_user_id` (already consistent in `v_all_transaction_items`)
- `stylist_name` → `staff_name` (already consistent)

Some hooks reference `phorest_client_id` or `phorest_staff_id` as column names in their queries — these will need to be updated to the union view's normalized column names.

## Scope

- 2 database migrations (union views)
- 17 file edits (14 hooks + 3 components)
- 1 new utility file
- No breaking changes — union views include all existing Phorest data plus Zura-native data

