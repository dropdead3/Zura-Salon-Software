

# Dynamic PDF Filenames for All Export Paths

## Problem
Currently, some PDF downloads use generic or hardcoded filenames (e.g., `backroom-stock-all-locations`). The filenames should reflect the specific report type, location name, and context so users can identify files easily.

## Current State
`buildReportFileName` already supports `orgName`, `locationName`, `reportSlug`, and date ranges — the issue is that some call sites pass incomplete or generic slugs, especially in the multi-location export paths.

## Changes

### 1. `StockTab.tsx`
- **Combined multi-location**: Change slug from `'backroom-stock-all-locations'` to `'backroom-stock-combined'` and include all location names or "all-locations" in the filename
- **Separate per-location**: Already correct — `exportStockPdf` passes `locationInfo.name` through to `buildReportFileName`

### 2. `CountsTab.tsx`
- The `generateCountSheetPdf` call already uses `locationName` — filenames are dynamic per location. No change needed.

### 3. `AuditLogTab.tsx`
- `exportBulkPdf` currently saves as `inventory-audit-log` without location name. Update to include the current location name in the filename via `buildReportFileName({ orgName, locationName, reportSlug: 'inventory-audit-log', dateFrom })`.

### 4. `generateCountSheetPdf.ts`
- Already uses `buildReportFileName` with `orgName`, `locationName`, and `reportSlug: 'count-sheet'`. Already dynamic. No change needed.

### Summary of filename outputs after fix

| Tab | Scope | Example filename |
|-----|-------|-----------------|
| Stock | Single | `OrgName_Downtown_backroom-stock_2026-03-19.pdf` |
| Stock | All Combined | `OrgName_backroom-stock-combined_2026-03-19.pdf` |
| Stock | All Separate | `OrgName_Downtown_backroom-stock_2026-03-19.pdf` (per location) |
| Counts | Single | `OrgName_Downtown_count-sheet_2026-03-19.pdf` |
| Counts | All Separate | `OrgName_Downtown_count-sheet_2026-03-19.pdf` (per location) |
| Audit | Single | `OrgName_Downtown_inventory-audit-log_2026-03-19.pdf` |

