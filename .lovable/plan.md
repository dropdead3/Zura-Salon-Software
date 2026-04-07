

# Bulk Staff Report PDF — Multi-Select & "Select All"

## Problem
The staff selector is a single-select dropdown. Coaches preparing for group meetings must generate reports one at a time, switching between staff members repeatedly. There's no way to batch-download multiple staff reports as a single printable document.

## Solution

### 1. Add multi-select staff picker
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`**

Replace the single `Select` dropdown with a multi-select popover (using `Popover` + `Command` from shadcn) that supports:
- **Select All / Deselect All** toggle at the top
- Checkbox next to each staff member name + avatar
- Badge showing count of selected members (e.g., "3 selected")
- Single-click on a name still works to preview that member's report on-screen (the first selected member is shown)

State changes:
- `selectedStaffId: string` → `selectedStaffIds: string[]`
- The on-screen report preview shows the **first** selected member (or whichever was last clicked)
- `useIndividualStaffReport` and `useStaffComplianceSummary` continue to load for the currently-viewed member

### 2. Add "Download All" bulk PDF button
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`**

New `generateBulkPDF` function:
- Iterates through all `selectedStaffIds`
- For each staff member, fetches their report data via direct Supabase queries (reusing the same query logic from `useIndividualStaffReport`)
- Renders each member's report section into the same `jsPDF` document
- Each member starts on a **new page** (`doc.addPage()` before each member after the first)
- Adds a page header with staff name on each member's first page
- Adds consistent footer with page numbers across the full document
- Saves as a single PDF file

Button behavior:
- When **1 member** selected → shows "Download PDF" (existing behavior)
- When **2+ members** selected → shows "Download All (N)" with a batch icon
- Progress toast shows "Generating report 2 of 5..." during bulk generation

### 3. Refactor PDF generation into a reusable function
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`**

Extract the current `generatePDF` logic into a helper `addStaffReportToDoc(doc, data, complianceData, options)` that:
- Takes an existing `jsPDF` instance
- Renders one staff member's full report (header, KPI table, services, clients, color room)
- Returns the doc for chaining
- Used by both single and bulk PDF flows

## UI Details
- Multi-select trigger shows avatar stack (up to 3) + "+N more" when multiple selected
- "Select All" checkbox at top of the dropdown list
- CSV export remains single-staff (for the currently viewed member)
- The on-screen preview continues showing one member at a time with clickable navigation between selected members

## Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/reports/IndividualStaffReport.tsx` | Multi-select picker, bulk PDF generation, refactored PDF helper |

1 file modified. No database changes.

