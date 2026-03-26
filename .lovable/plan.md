

## Rename "Reweigh Reports" → "Compliance Reports" + Add Staff Report Generator

### Changes

**1. Rename all "Reweigh Reports" references to "Compliance Reports"**

| File | What changes |
|------|-------------|
| `BackroomSettings.tsx` | Sidebar label: `'Compliance Reports'`, tooltip updated |
| `BackroomComplianceSection.tsx` | Infotainer title, h2 heading, subtitle, empty state text — all renamed from "Reweigh" to "Compliance" |

**2. Add "Prepare Staff Report" button + dialog to `BackroomComplianceSection.tsx`**

- New `<Button>` in the header controls row (next to "Evaluate Today"): **"Staff Report"** with a `FileDown` icon
- Clicking it opens a new `<StaffComplianceReportDialog>` component

**3. Create `StaffComplianceReportDialog.tsx`** (new file)

A dialog that lets admins quickly generate a 1:1 coaching report for a specific staff member:

- **Step 1 — Pick Staff**: Dropdown populated from `data.staffBreakdown` (staff who have compliance data)
- **Step 2 — Date Range**: Inherits the current range filter by default, with option to adjust
- **Step 3 — Action**: "Download PDF" and "Print" buttons

**4. Create `staffComplianceReportPdf.ts`** (new utility)

Generates the PDF using `jsPDF` + `jspdf-autotable` (already in the project). Report contents:

- **Header**: Org name/logo, "Staff Compliance Report", staff name, date range, generated date
- **Summary Card**: Compliance rate, reweigh rate, waste %, waste cost, total appointments, missed sessions
- **Compliance Badge**: Strong / Watch / Needs Attention (matching the UI badges)
- **Appointment Detail Table**: Date, service, compliance status, reweigh status, waste amount — from the filtered `items` array
- **Coaching Notes Section**: Empty lined area for the admin to write notes during the 1:1 meeting
- **Footer**: Page numbers, org name

The PDF pulls data from the existing `useBackroomComplianceTracker` hook filtered to the selected staff member — no new database queries needed.

### Files

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/BackroomSettings.tsx` | Rename sidebar label |
| `src/components/dashboard/backroom-settings/BackroomComplianceSection.tsx` | Rename headings; add "Staff Report" button; integrate dialog |
| `src/components/dashboard/backroom-settings/compliance/StaffComplianceReportDialog.tsx` | **New** — staff picker + date range + download/print actions |
| `src/utils/staffComplianceReportPdf.ts` | **New** — PDF generation with jsPDF |

### Result
Admins click "Staff Report" → pick a stylist → download or print a branded compliance report ready for their 1:1 coaching session.

