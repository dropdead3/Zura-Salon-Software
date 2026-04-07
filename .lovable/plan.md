

# Add Table Export (Spreadsheet + PDF) to Criteria Comparison Table

## What This Does

Adds a download button to the Criteria Comparison Table (the grid showing all levels' compensation, promotion, and retention metrics) that lets admins export the exact table view as either a CSV spreadsheet or a PDF document.

## Technical Changes

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**1. Add export button next to the instruction text (line ~853)**

Place a small dropdown button (using the existing `CardExportButton` pattern with `DropdownMenu`) at the right side of the instruction text area, with two options: "Export as Spreadsheet (.csv)" and "Export as PDF".

**2. Build CSV export function inside `CriteriaComparisonTable`**

Collect table data into a flat array of rows:
- Header row: `Metric, Level 1 Name, Level 2 Name, ...`
- Section header rows: `COMPENSATION`, `PROMOTION`, `RETENTION`
- Data rows for each metric using the existing `metrics` array and `getCriteria()` — the same `getValue()` functions that render the cells
- Compensation rows (Service Commission, Retail Commission, Hourly Wage) pulled from the `levels` prop

Generate a CSV blob and trigger browser download.

**3. Build PDF export function**

Reuse the existing `generateLevelRequirementsPDF` for the PDF option since it already renders the same data in a polished format. Wire it the same way the roadmap view does (lines 2679-2687), loading the org logo and passing levels/criteria.

**4. Imports**

Add `FileSpreadsheet` to lucide imports. `FileDown` and `DropdownMenu` components are already imported.

## Scope
- Single file modified: `StylistLevelsEditor.tsx`
- ~60 lines added (CSV builder + dropdown UI)
- No database changes
- No new dependencies

