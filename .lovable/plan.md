

# Remove Onboarding Requirements from My Level Progress Page

## Context

You're absolutely right — onboarding checklists (proving you can do a haircut, wash a head, etc.) are a **new-hire onboarding** concern, not a **level graduation** concern. The platform already has a dedicated onboarding system (`/onboarding` for staff, `/admin/onboarding-tracker` for admins, Settings > Onboarding for configuration). The graduation requirements checklist was incorrectly co-located on the "My Level Progress" page.

## Changes

### 1. Clean up `MyGraduation.tsx`
Remove the entire onboarding requirements section (progress overview card + requirements-by-category cards, ~lines 476-543). Also remove the now-unused imports: `useGraduationRequirements`, `useGraduationSubmissions`, `useCreateSubmission`, `useUploadProof`, `useSubmissionFeedback`, `RequirementCard`, `FeedbackSection`, related state variables, and the `submissionMap`/progress calculations.

The page retains:
- **StylistScorecard** (performance metrics)
- **LevelProgressionLadder** (career path visualization)
- **Retention risk warnings**
- **Level History timeline**

### 2. Remove `RequirementCard` and `FeedbackSection` components
These are defined inline in `MyGraduation.tsx` (~lines 63-355). Remove them entirely since they're only used by the graduation requirements checklist being removed.

### 3. Clean up unused imports
Remove `useStylistLevels` import added for level filtering, the `STATUS_COLORS`/`STATUS_LABELS`/`CATEGORY_ICONS`/`CATEGORY_LABELS` constants, and all graduation-tracker hook imports that are no longer needed on this page.

## What stays untouched
- The **admin Graduation Tracker** (`/admin/graduation-tracker`) — admins may still want to manage and review onboarding requirement submissions there
- The **Onboarding page** (`/onboarding`) — the existing staff-facing onboarding system
- The **graduation_requirements** database tables and hooks — they still serve the admin tracker and the onboarding system
- The `LevelProgressNudge` and `GraduationKpiTile` dashboard widgets

## Result
"My Level Progress" becomes purely about **performance KPIs, level advancement, and retention** — no onboarding checklists mixed in. Onboarding stays in the onboarding system where it belongs.

