

# Add Staff Strikes History to 1:1 Reports

## Problem
The Individual Staff Report (used for 1:1 coaching prep) does not surface the team member's strikes history. Coaches have no visibility into write-ups, complaints, red flags, or warnings when preparing for meetings — they must check a separate screen.

## Solution

Add a "Staff Strikes" section to both the on-screen report and the PDF export, showing active and recent resolved strikes for the selected staff member.

### 1. Fetch strikes data for the viewed staff member
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`**

- Import `useStaffStrikes` from `@/hooks/useStaffStrikes`
- Call `useStaffStrikes(viewingStaffId)` to get the member's strike history
- Filter to show: all active strikes + resolved strikes within the report date range

### 2. Add on-screen Strikes section (new Section 9b, before Strengths)
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`**

- New card titled "Staff Strikes" with `AlertTriangle` icon
- Summary row: active count, resolved count (in period), total count
- Table with columns: Date, Type, Severity, Title, Status (Active/Resolved)
- Each row uses existing `STRIKE_TYPE_LABELS`, `SEVERITY_LABELS`, and severity color badges
- If no strikes, show a clean "No strikes on record" empty state with a `ShieldCheck` icon

### 3. Add strikes to the PDF export
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`** — `addStaffReportToDoc` callback

- Accept strikes data as an additional parameter
- After top clients table, add a "Staff Strikes" section with an autoTable listing: Date, Type, Severity, Title, Status
- Critical/high severity rows highlighted with light red background
- If no strikes, skip the section in PDF (keeps it clean)

### 4. Add strikes to the bulk PDF flow
**File: `src/components/dashboard/reports/IndividualStaffReport.tsx`** — `generateBulkPDF`

- For each staff member in the bulk loop, fetch their strikes via a direct supabase query (same pattern as the existing compliance fetch)
- Pass strikes into `addStaffReportToDoc`

### 5. Include strikes in Strengths/Improvements analysis
- If active strikes > 0: add to improvements list (e.g., "2 active strikes on record — review during meeting")
- If zero strikes in period: optionally add to strengths ("Clean record — no strikes in this period")

## Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/reports/IndividualStaffReport.tsx` | Add strikes hook, on-screen section, PDF section, bulk PDF support, strengths/improvements integration |

1 file modified. No database changes.

