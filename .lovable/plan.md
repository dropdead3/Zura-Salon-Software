

# Add Org Name and Location to PDF Filenames

## Problem
PDF filenames are generic (e.g., `capacity-report-2026-03-01-to-2026-03-19.pdf`). When downloading multiple reports, it's hard to tell which org/location they belong to.

## Approach
Create a shared filename helper and update all 20+ `doc.save()` calls to include the org name and location name (when available) in the filename.

### New helper in `src/lib/reportPdfLayout.ts`

```ts
export function buildReportFileName(parts: {
  orgName?: string;
  locationName?: string;
  reportSlug: string;
  dateFrom?: string;
  dateTo?: string;
}): string {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const segments = [
    parts.orgName ? sanitize(parts.orgName) : null,
    parts.locationName ? sanitize(parts.locationName) : null,
    parts.reportSlug,
    parts.dateFrom,
    parts.dateTo ? `to-${parts.dateTo}` : null,
  ].filter(Boolean);
  return segments.join('_') + '.pdf';
}
```

Example output: `Drop-Dead-Salons_Downtown_capacity-report_2026-03-01_to-2026-03-19.pdf`

### Files to update (each `doc.save()` call)

All report generators already have `orgName` and `locationInfo` in scope. Replace hardcoded filenames with `buildReportFileName(...)`:

1. **CapacityReport.tsx** — `capacity-report`
2. **ClientRetentionReport.tsx** — `client-retention`
3. **EndOfMonthReport.tsx** — `end-of-month`
4. **ExecutiveSummaryReport.tsx** — `executive-summary`
5. **FinancialReportGenerator.tsx** — uses `reportType` slug
6. **IndividualStaffReport.tsx** — `staff-report-{staffName}`
7. **NoShowReport.tsx** — uses `reportType` slug
8. **PayrollSummaryReport.tsx** — `payroll-summary`
9. **RetailProductReport.tsx** — `retail-report`
10. **RetailStaffReport.tsx** — `retail-by-staff`
11. **SalesReportGenerator.tsx** — uses `reportType` slug
12. **StaffKPIReport.tsx** — uses `reportType` slug
13. **StockTab.tsx** — `backroom-stock`
14. **AuditLogTab.tsx** — `inventory-audit-log`
15. **InventoryAuditDialog.tsx** — `audit-trail-{productName}`
16. **CountsTab.tsx** (count sheet) — already has location, add org
17. **generateCountSheetPdf.ts** — add org name
18. **generatePurchaseOrderPdf.ts** — add org name
19. **SalesReportPDF.tsx** — `sales-report`
20. **BirthdayExportButton.tsx** / **StrikeExportButton.tsx** — add org name

Each change is a single-line filename swap using the new helper.

