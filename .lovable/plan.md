

# Add Date Range to Audit Log PDF Filenames

## Problem
The audit log PDF filename always uses today's date, even when the user has applied date filters. This makes it hard to distinguish exports covering different periods.

## Change

### `AuditLogTab.tsx`

1. **Pass `dateFrom` and `dateTo` filter values** to `exportBulkPdf` so the filename reflects the active date range.

2. **Update `exportBulkPdf` signature** to accept optional `dateFrom` and `dateTo` date parameters.

3. **Update the `doc.save()` call** (line 108) to use the filter dates when available:
   - If `dateFrom` is set, use it as the `dateFrom` param in `buildReportFileName`
   - If `dateTo` is set, use it as the `dateTo` param
   - Fall back to today's date when no filters are active

This produces filenames like:
- No filter: `OrgName_Downtown_inventory-audit-log_2026-03-19.pdf`
- With date range: `OrgName_Downtown_inventory-audit-log_2026-03-01_to_2026-03-15.pdf`

### Files to edit
- `src/components/dashboard/backroom-settings/inventory/AuditLogTab.tsx` — only file affected

