

# Add Grace Period vs Evaluation Window Explainer

## Problem
The relationship between "Grace Period" and "Evaluation Window" in the retention criteria configurator is not immediately clear. A grace period shorter than the evaluation window, equal to it, or longer than it each mean meaningfully different things for how quickly action is taken — but the UI provides no guidance.

## Solution
Add a dynamic contextual hint below the Grace Period selector that changes based on the relationship between the two values. This follows the existing pattern of `text-[10px] text-muted-foreground` helper text already used in this section.

### File: `src/components/dashboard/settings/GraduationWizard.tsx`

**After the Grace Period button group (line ~1358), add a dynamic explainer:**

Compute the relationship between `retForm.grace_period_days` and `retForm.evaluation_window_days`, then render one of three contextual messages:

| Relationship | Message |
|---|---|
| Grace < Eval Window | "Grace period is shorter than the evaluation window — action will be flagged before a full evaluation cycle completes. Use this for urgent metrics." |
| Grace = Eval Window | "Grace period matches the evaluation window — a stylist gets exactly one full evaluation cycle to recover before action is taken." |
| Grace > Eval Window | "Grace period is longer than the evaluation window — the stylist may be re-evaluated multiple times before action is triggered. This is more forgiving." |

Styled as a small info callout: `rounded-lg bg-muted/50 border border-border/50 p-2.5` with an `Info` icon, matching the existing "KPI Minimums Inherited" pattern but smaller.

### Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/settings/GraduationWizard.tsx` | Add dynamic explainer block after grace period selector |

1 file, no database changes.

