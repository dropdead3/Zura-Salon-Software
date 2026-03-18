

# Bulk Actions Toolbar + Count Sheet PDF Export

## 1. Bulk Actions Toolbar (ReorderTab.tsx)

Add a sticky toolbar that appears when items are selected, providing batch operations beyond just "Create POs."

**Changes to `ReorderTab.tsx`:**
- Add a `BulkActionsBar` component that renders as a fixed-position bar at the bottom of the reorder area when `selectedIds.size > 0`
- Include actions: **Select All**, **Deselect All**, **Create POs for Selected** (existing logic moved here), and a **selected count / est. cost summary**
- Move the existing "Create POs" button from the top action bar into this toolbar for better visibility
- Add "Select All" / "Deselect All" convenience buttons that operate across all supplier groups
- Show total estimated cost for selected items in the bar

**Toolbar layout:** A horizontal bar with: `[Checkbox] N selected | Est: $X,XXX | [Deselect All] [Create POs]`

---

## 2. Count Sheet PDF Export (CountsTab.tsx)

Add a "Print Count Sheet" button that generates a PDF checklist for physical counting.

**Changes to `CountsTab.tsx`:**
- Add a `FileDown` (or `Printer`) icon button next to "Start New Count" labeled "Print Count Sheet"
- On click, generate a PDF using `jsPDF` + `jspdf-autotable` with the existing `reportPdfLayout` helpers (`addReportHeader`, `addReportFooter`)

**PDF content:**
- Header: org name, "Physical Count Sheet", current date, location name
- Table columns: **Product Name** | **Brand** | **SKU** | **Expected Qty** | **Actual Qty** (blank) | **Variance** (blank) | **Notes** (blank)
- Products grouped by brand, sorted alphabetically
- Data source: `useBackroomInventoryTable` (already available in the component tree; will import directly)

**New file:** `src/lib/generateCountSheetPdf.ts` — a standalone function `generateCountSheetPdf(products, orgName, locationName?, logoDataUrl?)` that builds and saves the PDF.

---

## Files to modify

| File | Changes |
|------|---------|
| `ReorderTab.tsx` | Add bulk actions toolbar with select all/deselect all and summary |
| `CountsTab.tsx` | Add "Print Count Sheet" button, wire to PDF generator |
| `src/lib/generateCountSheetPdf.ts` (new) | Count sheet PDF generation using jsPDF + reportPdfLayout helpers |

No database changes needed.

