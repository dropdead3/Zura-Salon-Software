

# Replace Criteria Table PDF with Spreadsheet-Style Table PDF

## Problem
The "Export as PDF" button currently generates a card-based Level Roadmap PDF. The user expects this button — which sits above the criteria comparison table — to export a PDF that mirrors the table itself, like a spreadsheet printout.

## Solution
Replace the `generateLevelRequirementsPDF` call in the Export dropdown with a new function that renders the criteria table as a landscape PDF using `jspdf-autotable`. The data assembly already exists in the CSV export logic — we reuse that same row structure.

## Changes

### New File: `src/components/dashboard/settings/LevelCriteriaTablePDF.ts`
- Landscape A4 PDF using jsPDF + autoTable
- Branded header: org name, "Level Criteria Comparison", date
- Uses Termina for header, Aeonik Pro for table body (via `registerPdfFonts`)
- Table columns: Metric | Level 1: Name | Level 2: Name | ... | Level N: Name
- Sections separated by styled header rows: COMPENSATION, PROMOTION, RETENTION
- Includes all metrics currently in the comparison table (commission rates, hourly wage, revenue, retail %, rebooking %, avg ticket, retention, new clients, utilization, rev/hr, tenure, eval window)
- Alternating row shading, centered values, frozen first column styling

### Modified File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`
- Replace the `generateLevelRequirementsPDF` call in the Export dropdown (lines 925-973) with a call to the new `generateLevelCriteriaTablePDF`
- Pass the same data: levels, promotion criteria, retention criteria, commissions, org name
- Import swap: new function instead of roadmap PDF generator
- The roadmap PDF remains available from its own location (the Roadmap view) — it's just no longer attached to this button

## Technical Notes
- `jspdf-autotable` is already a project dependency (used by StaffLevelReportPDF)
- The CSV export logic (lines 896-920) already assembles the exact row data needed — the PDF function will follow the same structure
- No database changes

| File | Change |
|---|---|
| `LevelCriteriaTablePDF.ts` | New — landscape table PDF generator |
| `StylistLevelsEditor.tsx` | Swap PDF export to use table generator |

2 files, no database changes.

