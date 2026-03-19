

# Add Location Info to PDF Reports

## Problem
PDFs don't show which location they're for — no name, address, or store number.

## Approach

### 1. Extend `ReportHeaderOptions` in `reportPdfLayout.ts`

Add an optional `locationInfo` field:
```ts
locationInfo?: {
  name: string;
  address?: string;
  storeNumber?: string | null;
};
```

In `addReportHeader`, render location details below the org name line (small, muted text) — e.g. "Downtown · 123 Main St · Store #004". Compact single line, only showing fields that exist. Bump `REPORT_BODY_START_Y` from 48 → 52 to accommodate.

### 2. Update `StockTab.tsx` — Inventory PDF

The component receives `locationId` as a prop. The parent `BackroomInventorySection` already fetches `locations` via `useActiveLocations()`.

- Pass the selected location object (name, address, store_number) down to `StockTab` as a new `locationInfo` prop, or have `StockTab` look up the location from `useActiveLocations()` using its `locationId`.
- Simpler: use `useActiveLocations()` inside `StockTab` and find the matching location. Pass it into `exportStockPdf` → `headerOpts.locationInfo`.

### 3. Update `CountsTab.tsx` — Count Sheet PDF

Same pattern: resolve location from `locationId` prop using `useActiveLocations()`, pass into the count sheet header.

### 4. Update all report generators in `src/components/dashboard/reports/`

Each report already receives `locationId` as a prop. Add `useActiveLocations()` to resolve the location name/address/store_number, then pass `locationInfo` into `headerOpts`.

Files: `FinancialReportGenerator`, `SalesReportGenerator`, `StaffKPIReport`, `CapacityReport`, `RetailProductReport`, `NoShowReport`, `IndividualStaffReport`, `RetailStaffReport`, `PayrollSummaryReport`, `EndOfMonthReport`, `ExecutiveSummaryReport`, `ClientRetentionReport`.

For reports with `locationId === 'all'` or undefined, `locationInfo` stays undefined (no location line shown).

### Summary

| File | Change |
|------|--------|
| `reportPdfLayout.ts` | Add `locationInfo` to interface + render location line in header |
| `StockTab.tsx` | Resolve location, pass to `exportStockPdf` |
| `CountsTab.tsx` | Resolve location, pass to count sheet generator |
| 12 report generators | Resolve location from `locationId`, pass `locationInfo` into header opts |

