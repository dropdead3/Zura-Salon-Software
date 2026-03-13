

# Gaps, Suggestions, and Enhancements Before Approval

## Gaps in the Current Plan

### 1. No `backroom_compliance_log` table exists yet
The compliance tracker plan references this table but the approved plan doesn't include the database migration step. We need to create the table, RLS policies, and indexes before any hooks can query it. This should be the first step.

### 2. `isColorOrChemicalService()` is duplicated
The logic lives in two places today:
- `useAssistantDailyPrep.ts` — inline `isColorService()` function with a hardcoded keyword list
- `serviceCategorization.ts` — has `getServiceCategory()` returning "Color" and "Blonding" but no unified boolean check

The plan mentions exporting a shared `isColorOrChemicalService()` from `serviceCategorization.ts`, but we should also refactor `useAssistantDailyPrep.ts` to use it — otherwise the two lists will drift.

### 3. The 1:1 ReportBuilder has no access to performance data today
Currently `ReportBuilder.tsx` only pulls meeting notes and accountability items. It has no hook for fetching appointment or mix session data. The plan says "fetch compliance data for the trailing 30 days" but doesn't specify how to resolve the staff member's `organization_id` — since the component only receives `teamMemberId` and `teamMemberName`. We'll need to look up the org from the team member's employee profile inside `useStaffComplianceSummary`.

### 4. Team average compliance is missing from `useIndividualStaffReport`
The plan adds compliance to the staff report but doesn't mention adding a `complianceRate` field to `TeamAverages`. Without it, the "vs team avg" comparison card won't work.

### 5. No evaluation trigger — data will be empty on first load
The compliance log only gets populated when someone clicks "Evaluate Now." On first visit the dashboard will be empty with no explanation. We should either:
- Auto-evaluate on page load if today hasn't been evaluated yet
- Show an explicit empty state with a prominent "Run First Evaluation" CTA

## Suggested Enhancements

### A. Add a "Compliance" column to the existing Backroom Overview health check
The Setup Overview already shows configuration health. Add a compliance readiness indicator: "X of Y color appointments tracked today" — gives instant visibility without navigating to the full compliance tab.

### B. Surface compliance in the Experience Score
The Experience Score in `useIndividualStaffReport.ts` currently weights rebooking, tips, retention, and retail. Consider adding a 5th weight for backroom compliance (e.g., 10% weight, reducing others proportionally). This makes compliance visible in every staff evaluation, not just a separate section.

### C. Batch evaluation via edge function (future phase)
Rather than relying on manual "Evaluate Now" clicks, schedule a nightly edge function that evaluates the previous day automatically. This ensures the compliance log is always populated for reporting. Mark this as Phase 2 so it doesn't block the current build.

### D. Compliance data in PDF export
The Individual Staff Report already has a PDF generator using jsPDF + autoTable. The plan should explicitly call out adding a "Backroom Compliance" section to the PDF with a small table (Total Color Appts | Tracked | Missed | Reweigh Rate | Compliance %).

### E. "Excuse" workflow for legitimate misses
Some appointments won't have mix sessions for valid reasons (client changed their mind, color was pre-mixed off-site, etc.). Without an excuse mechanism, the compliance rate will be artificially low and stylists will distrust the system. Consider adding a `compliance_override` field with manager approval — even if it's Phase 2.

## Recommended Adjustments to the Plan

1. **Add the database migration** for `backroom_compliance_log` as the first task
2. **Consolidate** `isColorOrChemicalService()` in `serviceCategorization.ts` and update `useAssistantDailyPrep.ts` to import it
3. **Add `complianceRate` to `TeamAverages`** in `useIndividualStaffReport.ts`
4. **Resolve org context** in `useStaffComplianceSummary` — accept orgId as optional param, fall back to employee profile lookup
5. **Add compliance to PDF/CSV exports** explicitly
6. **Auto-evaluate on first load** of the compliance dashboard if no records exist for today

These are all additive — the core plan is solid. Approve with these adjustments and I'll implement everything together.

