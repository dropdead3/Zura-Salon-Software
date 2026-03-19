

# PDF Export Options Dialog

## Summary
When clicking the PDF button, show a popover/dialog with export scope options. For single-location orgs, export directly. For multi-location orgs, offer choices.

## Dialog Options

**Step 1 — Scope**
- **Current Location Only** — export for the currently selected location
- **All Locations** — export for every location

**Step 2 — Format (only shown when "All Locations" is selected)**
- **Separate Files** — downloads one PDF per location
- **Combined File** — merges all locations into a single PDF with page breaks

## Implementation

### New Component: `PdfExportDialog.tsx`
A small dialog triggered by the PDF button. Props:
- `open`, `onOpenChange`
- `locations` (all active locations)
- `currentLocationId`
- `onExport(scope: 'current' | 'all', format: 'separate' | 'combined')` callback

Uses RadioGroup for selections, with the format step conditionally shown. "Download" button at bottom.

### Changes to `BackroomInventorySection.tsx`
- Replace the direct `pdfExportRef.current?.()` call with opening the dialog
- Track dialog state (`pdfDialogOpen`)
- Change `pdfExportRef` signature to accept a location ID (or array): `React.MutableRefObject<((locationIds: string[], combined: boolean) => void) | null>`
- On dialog confirm, call `pdfExportRef.current(selectedLocationIds, isCombined)`

### Changes to Tab Components (`StockTab`, `CountsTab`, `AuditLogTab`)
- Update the registered export handler signature to accept `(locationIds: string[], combined: boolean)`
- For "current location" — same as today, single export
- For "all locations, separate" — loop through location IDs, generate one PDF each
- For "all locations, combined" — generate pages per location into one jsPDF doc

### Files to Create/Edit
1. **Create** `src/components/dashboard/backroom-settings/inventory/PdfExportDialog.tsx`
2. **Edit** `BackroomInventorySection.tsx` — add dialog state, render dialog, update ref type
3. **Edit** `StockTab.tsx` — update export handler to accept location params
4. **Edit** `CountsTab.tsx` — same
5. **Edit** `AuditLogTab.tsx` — same

