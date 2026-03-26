

## Compliance Reports — Clean-Up & Enhancements

### 1. Fix all remaining "Reweigh" → "Compliance" naming

**File: `BackroomComplianceSection.tsx`**

| Line | Current | New |
|------|---------|-----|
| 1 | JSDoc: "Reweigh Reports" | "Compliance Reports" |
| 138 | KPI label: "Reweigh Rate" | "Compliance Rate" |
| 163 | KPI label: "Reweigh Rate" | "Reweigh Rate" (keep — this one is actually the reweigh-specific metric, but clarify) |
| 229 | Chart title: "Reweigh & Waste Trend" | "Compliance & Waste Trend" |
| 251/254 | Tooltip/legend: "Reweigh Rate" | "Compliance Rate" |
| 269 | Leaderboard title: "Staff Reweigh Rates" | "Staff Compliance" |

Also clarify the two rate cards: Card 1 = "Compliance Rate" (has mix session + reweigh), Card 3 = "Reweigh Rate" (of those with sessions, how many reweighed). Different metrics, currently same label.

### 2. Sort staff leaderboard explicitly

Add `.sort((a, b) => a.complianceRate - b.complianceRate)` before rendering the staff breakdown table so worst performers appear first (matches the tooltip promise).

### 3. Show overflow count on Missing Sessions

When more than 20 missing sessions exist, show a small "and X more" indicator below the list.

### 4. PDF improvements

**File: `staffComplianceReportPdf.ts`**

- Replace the non-functional "Waste %" column with "Overage" or remove it entirely
- Add Reweigh Rate to the summary card (6 metrics instead of 5)
- Fix badge width calculation — use full `getTextWidth` instead of `* 0.5` to prevent clipping "NEEDS ATTENTION"

### 5. Staff Report dialog — show date range context

**File: `StaffComplianceReportDialog.tsx`**

- Format the date range display more clearly (e.g., "Mar 19, 2026 → Mar 26, 2026" instead of raw yyyy-MM-dd)

### Files changed

| File | Changes |
|------|---------|
| `BackroomComplianceSection.tsx` | Rename labels, sort leaderboard, add overflow count |
| `staffComplianceReportPdf.ts` | Fix badge width, swap dead column, add reweigh rate metric |
| `StaffComplianceReportDialog.tsx` | Format date display |

