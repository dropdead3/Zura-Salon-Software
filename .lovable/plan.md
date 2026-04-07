

# Add Explainer for Level 1 — No Promotion Requirements

## What & Why

When an admin opens the Level 1 configurator, the "Level Requirements" tab is disabled but there's no explanation of **why**. The user needs a clear, contextual explainer that communicates: Level 1 is where every stylist starts — there are no requirements to earn it. The only configurable criteria are retention minimums (standards to stay / not get terminated).

## Change

**File:** `src/components/dashboard/settings/GraduationWizard.tsx`

**Location:** Inside the retention tab content for `levelIndex === 0`, immediately above the existing "Baseline Standards" amber info box (~line 1067-1068).

Add a blue explainer box (matching the Page Explainer aesthetic) with:

- **Icon:** `BookOpen` in a blue icon container
- **Eyebrow:** "PAGE EXPLAINER" (uppercase, `font-display`)
- **Title:** "No Requirements to Earn This Level"
- **Body:** "Every stylist begins here. There are no promotion criteria for the entry level — it is the starting point. Use the retention standards below to define minimum performance expectations. Stylists who fall below these thresholds can be flagged for review or termination."

This uses the same visual language as `Infotainer` / `FirstTimeCallout` (blue-500/[0.04] bg, blue-500/20 border) but is **not dismissible** — it's permanent contextual guidance, not a one-time callout.

## Scope

- Single file edit, ~15 lines added
- No database or component changes
- Inline explainer, not a registered `PageExplainer` (this is wizard-context-specific)

