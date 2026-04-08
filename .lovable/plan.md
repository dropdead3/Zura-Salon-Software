

# Reports Standalone Audit — Findings

## Report Hooks & Components: VERIFIED CLEAN

All 15 migrated report hooks and 3 report components correctly query the union views (`v_all_appointments`, `v_all_clients`, `v_all_transaction_items`). Zero direct `phorest_*` table references remain in report files.

**Views confirmed deployed** with correct columns and `security_invoker = true`.

---

## Bugs Found

### Bug 1: `staff_name` is NULL for all Phorest-sourced appointments (2,137 rows)

The `v_all_appointments` view hardcodes `NULL::text AS staff_name` for Phorest rows because `phorest_appointments` has no `staff_name` column — only `phorest_staff_id`.

**Impact:** Two reports show "Unknown" for staff on Phorest-sourced data:
- **Tip Analysis Report** — groups by `phorest_staff_id` but displays `staff_name`, which is NULL → "Unknown"
- **Client Attrition Report** — shows `staff_name` as last stylist, NULL for Phorest rows

**Fix:** Update the `v_all_appointments` view to LEFT JOIN `phorest_staff_mapping` and resolve `staff_name` from `phorest_staff_name`:

```sql
SELECT ...
  psm.phorest_staff_name AS staff_name,
  ...
FROM phorest_appointments pa
LEFT JOIN phorest_staff_mapping psm ON psm.phorest_staff_id = pa.phorest_staff_id
```

This is a single migration (recreate the view). No hook changes needed — they already select `staff_name`.

### Bug 2: `useTipAnalysisReport` groups by `phorest_staff_id` — breaks standalone

Line 51: `const staffId = row.phorest_staff_id || 'unknown'`. When running standalone (no Phorest), native appointments have `phorest_staff_id = NULL`, so all tips aggregate under "unknown".

**Fix:** Group by `stylist_user_id` instead (which is always populated for both sources), falling back to `phorest_staff_id` only if `stylist_user_id` is null.

### Bug 3: Deleted Appointments report uses `phorest_staff_id` for staff column

`DeletedAppointmentsReport.tsx` line 41/48 selects `phorest_staff_id` and displays it raw as the "Staff" column. For Zura-native appointments, this will be NULL. Should use `staff_name` or resolve via `stylist_user_id`.

### Bug 4: `v_all_clients` query limit of 5,000 rows

`useDuplicateClientsReport`, `useClientBirthdaysReport`, and `ClientSourceReport` all use `.limit(5000)` instead of `fetchAllBatched`. For organizations with large client bases, this silently truncates results.

**Fix:** Switch to `fetchAllBatched` for consistency with all other report hooks.

---

## Non-Report Phorest Dependencies (Out of Scope but Noted)

97 other files across the codebase still directly query `phorest_*` tables (scheduling, POS, analytics, payroll, kiosk, etc.). These are outside the report system and are tracked under the broader "Phorest Detach" roadmap. The report system itself is standalone-ready pending the 4 bugs above.

---

## Fix Plan

| File | Change |
|---|---|
| New migration | Recreate `v_all_appointments` with LEFT JOIN to `phorest_staff_mapping` for `staff_name` resolution |
| `src/hooks/useTipAnalysisReport.ts` | Group by `stylist_user_id` instead of `phorest_staff_id` |
| `src/components/dashboard/reports/DeletedAppointmentsReport.tsx` | Use `staff_name` (or `stylist_user_id` + lookup) instead of raw `phorest_staff_id` |
| `src/hooks/useDuplicateClientsReport.ts` | Replace `.limit(5000)` with `fetchAllBatched` |
| `src/hooks/useClientBirthdaysReport.ts` | Replace `.limit(5000)` with `fetchAllBatched` |
| `src/components/dashboard/reports/ClientSourceReport.tsx` | Replace `.limit(5000)` with `fetchAllBatched` |

1 migration + 5 file edits. No breaking changes.

