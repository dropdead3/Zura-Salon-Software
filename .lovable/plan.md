

# Add Download Dropdown with Staff Level Report

## Overview
Replace the single "Download PDF" button in the Level Roadmap action bar with a dropdown menu offering two options:
1. **Download Roadmap** — the existing level requirements PDF
2. **Download Staff Report** — a new PDF showing each stylist's current level, readiness status, composite score, recommended next level, and key KPI progress

## Architecture

### Dropdown Button (`LevelRoadmapView.tsx`)
- Replace the current `<button>` with a `DropdownMenu` (from shadcn) containing two items:
  - "Level Roadmap" — calls existing `onDownloadPDF`
  - "Staff Level Report" — calls new `onDownloadStaffReport`
- Button label changes to "Download" with a chevron-down indicator

### New prop and callback
- Add `onDownloadStaffReport` callback to `LevelRoadmapViewProps`
- Wire it from `StylistLevelsEditor.tsx` where `useTeamLevelProgress` data is already available (used elsewhere in the editor)

### Staff Report PDF (`StaffLevelReportPDF.ts` — new file)
A new jsPDF-based generator matching the roadmap PDF aesthetic (same header, footer, color palette, typography). Content:

- **Header**: Org name, "Staff Level Report", generation date — same centered layout as roadmap PDF
- **Summary strip**: Total staff count, Ready to Promote count, At Risk count, Below Standard count
- **Staff table** (one row per stylist, grouped by current level):
  - Name
  - Current Level (color-coded)
  - Status badge (Ready / In Progress / Needs Attention / At Risk / Below Standard / At Top Level)
  - Composite Score (%)
  - Recommended Next Level (or "—" if at top / no criteria)
  - Time at Level
  - Key gap (the single largest KPI shortfall, if any)
- Page breaks between level groups if needed
- Same footer as roadmap PDF ("Confidential — For internal use only")

### Data flow
`StylistLevelsEditor.tsx` already has access to `useTeamLevelProgress()` via the graduation tab. The `onDownloadStaffReport` callback will:
1. Call `useTeamLevelProgress` data (already cached from the hook)
2. Pass `TeamMemberProgress[]` + org info to the new PDF generator
3. Save as `staff-level-report.pdf`

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/settings/LevelRoadmapView.tsx` | Replace Download button with `DropdownMenu`, add `onDownloadStaffReport` prop |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Wire `onDownloadStaffReport` using `useTeamLevelProgress` data |
| `src/components/dashboard/settings/StaffLevelReportPDF.ts` | **New** — jsPDF generator for the staff level report |

No database changes.

