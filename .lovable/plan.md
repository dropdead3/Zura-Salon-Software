

# Wire Light-Mode Logo Into PDFs & Improve PDF Design

## Problem
1. All PDF exports use `effectiveOrganization?.logo_url` (a generic/fallback logo) instead of `businessSettings?.logo_light_url` — the proper light-background logo uploaded by the organization.
2. The PDF header design is plain — just stacked text with a thin divider line.

## Changes

### 1. Update `reportPdfLayout.ts` — Redesign the header layout

**Logo**: Use the light-mode logo (`logo_light_url`) with a fallback to `logo_url`. Add aspect-ratio-aware sizing by loading the image into an `Image()` element to get natural dimensions, then scale proportionally within max bounds (max-width 40mm, max-height 14mm) for a crisp, professional look.

**Layout redesign**:
- Position logo top-left, org name + report title to its right (side-by-side, not stacked below)
- Report title in bold 18pt, org name in 10pt gray above it
- Date range and "Generated on" right-aligned on the same line as the title block
- Replace the thin gray divider with a 1pt accent line using a dark charcoal color (#292929)
- Reduce `REPORT_BODY_START_Y` from 72 → ~52mm since side-by-side layout is more compact

**Footer**: Add org name to the left of the footer alongside "Page X of N" centered.

### 2. Update `exportStockPdf` in `StockTab.tsx`

- Import `useBusinessSettings` and pass `businessSettings?.logo_light_url` (falling back to `effectiveOrganization?.logo_url`) as the logo URL.
- Update the `handlePdfExport` callback to use the light logo.

### 3. Update all other PDF report generators (13 files)

Every file that calls `fetchLogoAsDataUrl(effectiveOrganization?.logo_url)` needs to prefer `businessSettings?.logo_light_url`. These files already have access to `effectiveOrganization` via `useOrganizationContext()` — they'll additionally need `useBusinessSettings()`.

**Files to update** (same one-line pattern change in each):
- `ExecutiveSummaryReport.tsx`
- `StaffKPIReport.tsx`
- `FinancialReportGenerator.tsx`
- `CapacityReport.tsx`
- `RetailProductReport.tsx`
- `NoShowReport.tsx`
- `IndividualStaffReport.tsx`
- `RetailStaffReport.tsx`
- `CountsTab.tsx`
- `PayrollSummaryReport.tsx`
- `EndOfMonthReport.tsx`
- `ReportPreviewModal.tsx`
- `StockTab.tsx`

Pattern in each:
```tsx
// Add import
const { data: businessSettings } = useBusinessSettings();

// Change logo resolution from:
fetchLogoAsDataUrl(effectiveOrganization?.logo_url ?? null)
// To:
fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null)
```

### 4. Improve `autoTable` styling in `StockTab.tsx`

- Change head fill color from solid black `[41,41,41]` to a lighter charcoal `[55,55,55]`
- Add alternating row colors: `alternateRowStyles: { fillColor: [248, 248, 250] }`
- Increase cell padding from 2 → 3 for better readability

These autoTable style improvements apply only to the inventory PDF for now; other reports can be refined separately.

### Result
- All PDFs use the organization's light-mode logo (designed for white backgrounds)
- Header is more compact and professional with side-by-side logo + title
- Table styling is cleaner with alternating rows and better spacing

