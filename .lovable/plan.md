

# Graduation Configurator Polish + Level Progress Surfacing in 1:1 Prep & Stylist Dashboard

## Current State

**Graduation Configurator (Admin)**: Functional wizard with 3 steps, PDF export, inline summaries, and roadmap card. Previous plan's enhancements are all shipped — slider bug fixed, PDF export working, summary card in right column.

**1:1 Meeting Prep (MeetingDetails.tsx)**: Shows meeting notes, accountability items, and a ReportBuilder that includes compliance data. No graduation progress or level-up context is surfaced for the stylist being coached.

**Staff 1:1 Prep Report (IndividualStaffReport)**: Comprehensive KPI report (revenue, rebooking, retention, experience score, compliance). No level progression data — doesn't show how close a stylist is to their next level.

**Stylist-Facing Dashboard**: Does not exist yet. No "My Growth" or "Leveling Roadmap" page. `tierProgress` and `amountToNextTier` in payroll forecasting are always `0`.

## Remaining Bugs in Graduation Wizard

1. **Threshold input allows 0 save** — A criterion can be toggled on with threshold left at 0. The wizard should require a non-zero threshold for enabled criteria before allowing "Next" from step 0.

2. **Revenue formatting inconsistency** — `formatCriteriaSummary` divides by 1000 and shows "$8K rev" but if someone enters 500 it shows "$1K rev" (rounds poorly). Should show "$500 rev" for values under 1000.

3. **PDF `\n` literal in cells** — The `formatCriteriaRow` function in LevelRequirementsPDF.ts uses `\n` for multi-line cell content but jspdf-autotable needs actual newlines, not escaped ones. The current file has `'\\n'` which renders as literal backslash-n in the PDF.

## Plan

### 1. Fix remaining wizard bugs

- **GraduationWizard.tsx**: Update `canProceedFromStep0` to also validate that all enabled criteria have non-zero thresholds.
- **StylistLevels.tsx**: Fix `formatCriteriaSummary` to show raw dollar amounts under $1,000 instead of dividing by 1000.
- **LevelRequirementsPDF.ts**: Verify newline handling in `formatCriteriaRow` — ensure `\n` is actual newline character, not double-escaped.

### 2. Create `useLevelProgress` hook

Computes a stylist's real-time graduation progress against their next level's criteria. Inputs: stylist's current level, their rolling performance data (from existing appointment/sales queries). Outputs: per-criterion progress percentages, weighted composite score, and gap analysis.

This hook powers both the 1:1 prep context and the future stylist dashboard.

### 3. Surface level progress in 1:1 Meeting Prep

Add a "Level Progress" card to `MeetingDetails.tsx` that shows:
- Current level and next level target
- Per-criterion progress bars (revenue, retail, rebooking, avg ticket)
- Weighted composite progress percentage
- Gap summary ("$1,200 more revenue needed")

This gives coaches immediate context on where a stylist stands relative to promotion.

### 4. Surface level progress in Staff 1:1 Prep Report

Add a "Level Progression" section to `IndividualStaffReport.tsx` showing:
- Current level vs next level
- Per-criterion current vs target values
- Composite progress percentage
- Include in PDF export as a new table section

### 5. Populate `tierProgress` in Payroll Forecasting

Wire `useLevelProgress` into `usePayrollForecasting.ts` so `tierProgress` and `amountToNextTier` reflect real graduation criteria instead of always being 0. This activates the existing `TierProgressionCard` and `TierProgressAlert` components.

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/GraduationWizard.tsx` | **Modify** — validate non-zero thresholds on enabled criteria |
| `src/pages/dashboard/admin/StylistLevels.tsx` | **Modify** — fix revenue formatting in `formatCriteriaSummary` |
| `src/components/dashboard/settings/LevelRequirementsPDF.ts` | **Modify** — fix newline escaping in criteria rows |
| `src/hooks/useLevelProgress.ts` | **Create** — compute stylist progress against next level criteria |
| `src/pages/dashboard/MeetingDetails.tsx` | **Modify** — add LevelProgressCard for coaching context |
| `src/components/coaching/LevelProgressCard.tsx` | **Create** — reusable card showing level progress bars and gaps |
| `src/components/dashboard/reports/IndividualStaffReport.tsx` | **Modify** — add level progression section to report + PDF |
| `src/hooks/usePayrollForecasting.ts` | **Modify** — populate tierProgress from level_promotion_criteria |

**3 new files, 5 modified files.**

