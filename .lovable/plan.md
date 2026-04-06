

# Onboarding Requirements — Level-Scoped & Admin-Configurable

## Problem

The current `graduation_requirements` system has three issues:

1. **No multi-tenancy** — no `organization_id` on any of the three tables (`graduation_requirements`, `graduation_submissions`, `graduation_feedback`). Every org sees the same global requirements.
2. **No level scoping** — requirements apply to all staff equally, regardless of what level they onboard at. A Level 7 hire sees "5 Haircuts (Observed)."
3. **Hardcoded tenant content** — seed data contains brand-specific text ("Drop Dead Extensions") violating the brand abstraction rule.

## Design

### Concept: "Onboarding Checklists" scoped to Level

Each requirement gets an optional `applies_to_level_ids UUID[]` column. When populated, only stylists whose **current assigned level** matches one of those IDs see the requirement. When null/empty, the requirement applies to **all** levels (backward-compatible default).

Admins manage this from the existing Settings > Stylist Levels area or a dedicated "Onboarding Requirements" settings panel, toggling which requirements apply to which levels.

### Database Migration

**1. Add `organization_id` to all three graduation tables:**

- `graduation_requirements` — add `organization_id UUID NOT NULL` (backfilled from a default org)
- `graduation_submissions` — add `organization_id UUID NOT NULL`
- `graduation_feedback` — inherits scope through submission join

**2. Add level scoping to `graduation_requirements`:**

- `applies_to_level_ids UUID[]` — array of `stylist_levels.id` values this requirement applies to. Null = all levels.

**3. Replace all RLS policies** with org-scoped versions using `is_org_member` / `is_org_admin`.

**4. Remove hardcoded seed data** — the seeded "Drop Dead Extensions" rows stay in the DB but future orgs won't get them. The admin UI handles creation.

### Frontend Changes

**A. Hook updates (`useGraduationTracker.ts`):**
- All queries add `.eq('organization_id', orgId)` filter
- `useGraduationRequirements` accepts optional `levelId` param and filters `applies_to_level_ids` to only show requirements relevant to the stylist's current level
- `useCreateRequirement` includes `organization_id` and `applies_to_level_ids`

**B. MyGraduation page (`MyGraduation.tsx`):**
- Pass the stylist's current level ID to `useGraduationRequirements` so they only see requirements assigned to their level
- If no requirements match their level, show an appropriate empty state ("No onboarding requirements for your level")

**C. Admin Requirements Manager (new or extended component):**
- When creating/editing a requirement, admin sees a multi-select of stylist levels
- "Applies to" chips showing which levels each requirement targets
- Toggle to apply to "All Levels" vs specific levels
- Accessible from Settings or the existing graduation tracker admin view

### File Changes

| File | Change |
|------|--------|
| New migration SQL | Add `organization_id` + `applies_to_level_ids` columns, update RLS |
| `src/hooks/useGraduationTracker.ts` | Add org scoping + level filtering to all queries/mutations |
| `src/pages/dashboard/MyGraduation.tsx` | Pass current level ID for filtered requirements |
| New/extended admin component | Level assignment UI for requirements |

### What This Enables

- Level 1 "New Talent" sees all 10 onboarding requirements
- Level 4 onboard sees only requirements tagged for Level 4 (maybe just "Manager Sign-Off")
- Level 7 onboard sees zero requirements (or just a final approval)
- Admins control everything per-org, per-level

