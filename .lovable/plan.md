

# Improve Weights Step with Explainer and "Equal Weight" Option

## Problem

The "Weights" step in the Level Criteria wizard is confusing. Users don't understand:
1. **What weights do** — they control the composite score (0-100%) used to determine promotion readiness
2. **How they work** — a metric at 20% weight contributes more to the overall score than one at 10%
3. **What if I want equal importance?** — there's no quick "distribute evenly" action; users must manually slide each one

## How Weights Actually Work (for context)

In `useTeamLevelProgress.ts`, the composite score is calculated as:
```
compositeScore = sum(each metric's percent × weight) / totalWeight
```
This score drives the "Overall Progress" bar, "Ready to Promote" status, and "Stalled Progression" detection. A stylist is "fully qualified" when compositeScore >= 100% AND all individual thresholds are met.

**Key insight**: Even with equal weights, every individual KPI threshold must still be met for full qualification. Weights only affect the composite progress percentage — they don't make metrics optional.

## Changes

**File:** `src/components/dashboard/settings/GraduationWizard.tsx`

### 1. Add explainer box above the weight sliders (step === 1)

Replace the single-line "Set the relative importance..." text with a blue explainer box:

- **Title:** "How Weights Work"
- **Body:** "Weights control how much each metric contributes to the overall readiness score. A higher weight means that metric has more influence on the progress percentage. Note: regardless of weights, a stylist must meet every individual threshold to qualify for promotion. Weights only affect the composite score used to track overall progress."
- Same blue styling as the Level 1 explainer (bg-blue-500/[0.04], border-blue-500/20, BookOpen icon)

### 2. Add "Distribute Evenly" button

Add a small action button (ghost variant, `Scale` icon) above the slider list that sets all enabled metrics to equal weight (100 / count, with remainder distributed). Label: "Distribute Evenly"

This directly addresses the "what if I want all KPIs to be equal importance" question with a single click.

### 3. Implementation detail

The even-distribution logic:
```ts
const active = CRITERIA.filter(c => form[c.enabledKey]);
const base = Math.floor(100 / active.length);
const remainder = 100 - base * active.length;
active.forEach((c, i) => { form[c.weightKey] = base + (i < remainder ? 1 : 0); });
```

## Scope
- Single file: `GraduationWizard.tsx`
- Add `Scale` to lucide imports
- ~25 lines added/modified
- No database changes

