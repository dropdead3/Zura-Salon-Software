

# PDF Economics Section + Staff Analytics Surface

## Overview

Two deliverables:
1. Add a "Level Economics" section to `StaffLevelReportPDF` showing per-level margin summaries and flagged services
2. Add economics metrics (margin status, effective hourly contribution) to the `StaffPerformanceReport` in the analytics hub

## 1. PDF Export — Level Economics Section

**File: `src/components/dashboard/settings/StaffLevelReportPDF.ts`**

After the existing staff table, add a new section:

**"Level Economics Summary" header** — same style as "Staff Level Report" subheader

**Level margin table** (one row per level):
- Columns: Level, Weighted Margin, Avg Revenue/Stylist, Commission Cost, Product Cost, Overhead, Status
- Status column uses color-coded text (green/amber/red matching Healthy/Tight/Underpriced)
- Only show levels with `hasEnoughData`; skip levels with insufficient appointments

**Flagged services mini-table** (below level summary):
- Header: "Services Below Target Margin"
- Columns: Service, Level, Price, Margin %, Gap
- Only include service-level combos where `marginPct < target` AND `appointmentCount >= 10`
- Cap at 15 rows, sorted by worst margin first
- If no flagged services, show "All service-level combinations are at or above target margin" in italic

**Silent margin erosion callout:**
- Below flagged services, list any service-level combos where `isFallbackPrice === true` and commission rate is higher than base level — one-line alert per item

**Interface change:** Expand `StaffLevelReportOptions` to accept `levelEconomics?: LevelEconomicsData` and `targetMarginPct?: number`. The PDF generator remains a pure function — the caller passes pre-computed data.

**Caller change in `StylistLevelsEditor.tsx`:** When calling `generateStaffLevelReportPDF`, pass the economics data from the already-loaded `useLevelEconomicsAnalyzer` hook.

**Page management:** Check `y` position before rendering economics section; add `doc.addPage()` if needed. Footer renders on all pages (existing logic handles this).

## 2. Staff Analytics Surface — Economics Columns

**File: `src/components/dashboard/analytics/StaffPerformanceReport.tsx`**

Add two new columns to the existing staff performance table:

- **Margin** — weighted margin % from `StylistSnapshot`, color-coded (green ≥ target, amber ≥ 0, red < 0). Shows "—" if `hasEnoughData` is false.
- **$/hr Contribution** — `effectiveHourlyContribution` from `StylistSnapshot`, formatted as currency. Shows "—" if insufficient data.

**Data integration:**
- Import `useLevelEconomicsAnalyzer` and `useStylistLevels` into `StaffPerformanceReport`
- Build a lookup map: `userId → StylistSnapshot` from `stylistSnapshots`
- Merge into existing rows during render (no changes to `useStaffPerformanceComposite`)

**Expanded row enhancement:**
- When a row is expanded, below existing coaching signals, add an "Economics" mini-section showing:
  - Level name + margin status badge
  - Cost breakdown: Commission / Product / Overhead / Wage as a simple inline list
  - Only visible when snapshot data exists for that stylist

**Sort integration:** Add `'margin'` and `'hourlyContribution'` to the `SortKey` union type so these columns are sortable.

## 3. Staffing Content Integration

**File: `src/components/dashboard/analytics/StaffingContent.tsx`**

No changes needed — `StaffPerformanceReport` is already surfaced in `SalesTabContent` and available as a standalone component. The economics data will flow through it automatically.

## Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/settings/StaffLevelReportPDF.ts` | Add Level Economics Summary section + flagged services table after staff table |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Pass `levelEconomics` data to PDF generator call |
| `src/components/dashboard/analytics/StaffPerformanceReport.tsx` | Add Margin + $/hr columns, economics expandable section, sort keys |

## Technical Notes

- PDF economics section uses same font/color conventions as existing report (Termina headers, Aeonik body, status dot colors from `STATUS_COLORS`)
- `BlurredAmount` / `AnimatedBlurredAmount` wraps all monetary values in the analytics surface
- `useLevelEconomicsAnalyzer` is already loaded in `StylistLevelsEditor` — just pass its output to the PDF function
- For `StaffPerformanceReport`, the hook call is new but uses the same 90-day window the analyzer defaults to — no date range prop needed
- No database changes required

