

# Graduation Pathway Configurator — Revised Plan

## Summary

Build a wizard-style configurator within Settings > Stylist Levels that lets admins define promotion criteria per level. The wizard makes it easy to toggle on/off which requirements matter and set thresholds — no form overload.

## Gaps and Improvements Over Previous Plan

1. **Organization scoping** — The `stylist_levels` table has no `organization_id` column. The new `level_promotion_criteria` table must join through `stylist_levels`, but `stylist_levels` itself is globally visible (RLS: any authenticated user). This means criteria need their own `organization_id` for proper tenant isolation, since different orgs may use the same level slugs with different promotion rules.

2. **Wizard UX instead of inline form** — Rather than cramming threshold fields into each level row, use a slide-out panel or dialog wizard with clear steps. This keeps the existing Stylist Levels page clean and adds a "Configure Graduation" button per level that opens the wizard.

3. **Toggle-based requirement selection** — The wizard should let admins toggle each criterion on/off (Revenue, Retail %, Rebooking %, Avg Ticket, Tenure). Only toggled-on criteria show threshold inputs. This avoids overwhelming admins with fields they don't care about.

4. **Weight auto-distribution** — When criteria are toggled, weights auto-distribute equally among active criteria. Admin can then adjust. Weights must sum to 100 and are validated client-side.

5. **First level has no criteria** — The lowest-order level is the entry point. The "Configure Graduation" button should be disabled or hidden for it, with a subtle note: "Entry level — no promotion criteria needed."

6. **Manual approval toggle** — Some salons want manager sign-off before promotion. This is a simple toggle in the wizard, not a separate workflow.

7. **No sustained-periods complexity for Phase 1** — Keep it simple: a single evaluation window (30/60/90 days). "Sustained periods" adds complexity that can come in Phase 2.

## Database

**New table: `level_promotion_criteria`**

```text
id                    UUID PK DEFAULT gen_random_uuid()
organization_id       UUID NOT NULL FK → organizations(id) ON DELETE CASCADE
stylist_level_id      UUID NOT NULL FK → stylist_levels(id) ON DELETE CASCADE
revenue_enabled       BOOLEAN DEFAULT false
revenue_threshold     NUMERIC DEFAULT 0
retail_enabled        BOOLEAN DEFAULT false
retail_pct_threshold  NUMERIC DEFAULT 0
rebooking_enabled     BOOLEAN DEFAULT false
rebooking_pct_threshold NUMERIC DEFAULT 0
avg_ticket_enabled    BOOLEAN DEFAULT false
avg_ticket_threshold  NUMERIC DEFAULT 0
tenure_enabled        BOOLEAN DEFAULT false
tenure_days           INTEGER DEFAULT 0
revenue_weight        INTEGER DEFAULT 0
retail_weight         INTEGER DEFAULT 0
rebooking_weight      INTEGER DEFAULT 0
avg_ticket_weight     INTEGER DEFAULT 0
evaluation_window_days INTEGER DEFAULT 30
requires_manual_approval BOOLEAN DEFAULT false
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
UNIQUE(organization_id, stylist_level_id)
```

RLS: org-scoped using `is_org_member` for SELECT, `is_org_admin` for INSERT/UPDATE/DELETE.

## Wizard UI Design

The wizard opens as a dialog when admin clicks "Graduation Pathway" on a level row.

**Step 1: Select Requirements** — Toggle switches for each criterion type (Revenue, Retail %, Rebooking %, Avg Ticket, Tenure). Each toggle reveals a threshold input inline. Clean, minimal, one criterion per row.

**Step 2: Set Weights** — Only shows enabled criteria. Sliders or number inputs that must sum to 100%. Auto-distributes on toggle changes. Skip this step if only one criterion is enabled (it gets 100%).

**Step 3: Evaluation Settings** — Evaluation window selector (30/60/90 days). Manual approval toggle. Summary preview of what a stylist needs to achieve.

**Summary card** at bottom: "To become [Level Name], a stylist must maintain $X revenue, Y% retail, Z% rebooking over 30 days."

## File Changes

| File | Action |
|------|--------|
| Migration SQL | **Create** — `level_promotion_criteria` table + RLS + trigger |
| `src/hooks/useLevelPromotionCriteria.ts` | **Create** — fetch/upsert criteria per level per org |
| `src/components/dashboard/settings/GraduationWizard.tsx` | **Create** — 3-step wizard dialog component |
| `src/pages/dashboard/admin/StylistLevels.tsx` | **Modify** — add "Graduation Pathway" button per level row (except first) |

**1 migration, 2 new files, 1 modified file.**

