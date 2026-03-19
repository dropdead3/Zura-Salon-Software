

# Bundle Multi-Location PDF Downloads into a ZIP File

## Summary
When exporting separate PDFs for multiple locations, bundle them into a single `.zip` file instead of triggering individual browser downloads. This applies to both StockTab and CountsTab "separate files" export paths.

## Approach
Use the **JSZip** library to collect generated PDFs in memory, then trigger a single `.zip` download via a Blob URL.

## Changes

### 1. Install `jszip` dependency
Add `jszip` to the project. No additional dependencies needed — Blob download is native.

### 2. Refactor `exportStockPdf` to return PDF bytes
Currently `exportStockPdf` calls `doc.save()` directly. Add an option to return the PDF as a `Uint8Array` instead of saving, so the caller can add it to a ZIP archive.

### 3. Update `StockTab.tsx` — separate export path
- Import `JSZip`
- In the "separate" branch of `handlePdfExport`, create a `JSZip` instance
- For each location, generate the PDF bytes (not saving) and add to the zip as `LocationName_backroom-stock_date.pdf`
- After the loop, call `zip.generateAsync({ type: 'blob' })` and trigger a single download with a filename like `OrgName_backroom-stock_2026-03-19.zip`

### 4. Update `CountsTab.tsx` — multi-location export path
- Same pattern: refactor `generateCountSheetPdf` to optionally return bytes instead of saving
- Collect into a JSZip instance and download as one `.zip`

### 5. Update `generateCountSheetPdf.ts`
Add an optional `returnBytes` flag. When true, return `doc.output('arraybuffer')` instead of calling `doc.save()`.

### Files to edit
1. `package.json` — add `jszip`
2. `src/lib/exportStockPdf.ts` (or wherever `exportStockPdf` lives) — add return-bytes option
3. `src/lib/generateCountSheetPdf.ts` — add return-bytes option
4. `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` — zip bundling
5. `src/components/dashboard/backroom-settings/inventory/CountsTab.tsx` — zip bundling

