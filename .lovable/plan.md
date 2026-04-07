
Good catch — your prompt clearly identified both the unclear sentence and the intended rule. A slightly stronger prompt next time would specify whether you want only the visible table phrase updated or a full retention-copy consistency sweep across related screens.

Plan

1. Update the retention header copy in `src/components/dashboard/settings/StylistLevelsEditor.tsx`
- Replace the current line:
  “KPI minimums inherited from Level Requirements · Falling below triggers demotion to Level 1”
- With copy that makes three things explicit:
  - retention uses that level’s configured standards
  - falling below can surface coaching or demotion flags depending on the configured action
  - Level 1 is a special case and should reference coaching or removal review, not demotion

2. Align the retention explainer copy in `src/components/dashboard/settings/GraduationWizard.tsx`
- Update the levels 2+ “KPI Minimums Inherited” note so it matches the same flag-based language
- Update the Level 1 explainer so it no longer says “review or termination” and instead uses the same clearer entry-level wording

3. Tighten the hover-help language
- Update the retention “Action” tooltip in `StylistLevelsEditor.tsx` so the helper text matches the new explanation and doesn’t imply every below-standard case becomes a demotion

Recommended wording direction
- Table header:
  “Retention uses each level’s KPI standards. Falling below them surfaces coaching or demotion flags based on the action configured for that level. For Level 1, falling below entry-level standards surfaces coaching or removal review.”
- Levels 2+ wizard note:
  “Retention thresholds follow the KPI standards configured above. The settings below determine how below-standard performance is evaluated and whether it surfaces coaching or demotion flags.”
- Level 1 wizard note:
  “Use these standards to define minimum entry-level performance. Falling below them surfaces coaching or removal review.”

Technical details
- Files:
  - `src/components/dashboard/settings/StylistLevelsEditor.tsx`
  - `src/components/dashboard/settings/GraduationWizard.tsx`
- No database or behavior changes
- I recommend using “entry-level” or the dynamic first-level label instead of hardcoding “New Talent,” since Level 1 naming is customizable
- I’ll keep the copy advisory-first so it doesn’t imply automatic demotion or automatic removal
