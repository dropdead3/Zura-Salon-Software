

# Location Inventory Lead Assignment

## Summary

Extend the existing **Responsibilities** system with location scoping so Super Admins can assign an "Inventory Lead" per location. When a location has no one assigned, a warning banner appears on the Inventory tab.

## Approach

The existing `responsibilities` + `user_responsibilities` tables are user-scoped with no location dimension. Rather than modifying that general-purpose system (which would affect all other responsibilities), we create a focused **location inventory lead** assignment table. This keeps the concern isolated, supports per-location assignment, and enables targeted coverage warnings.

---

## Database Changes

### New table: `location_inventory_leads`

```sql
CREATE TABLE public.location_inventory_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id)
);

ALTER TABLE public.location_inventory_leads ENABLE ROW LEVEL SECURITY;

-- Org members can view
CREATE POLICY "Org members can view inventory leads"
  ON public.location_inventory_leads FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Super admins / admins can manage
CREATE POLICY "Admins can manage inventory leads"
  ON public.location_inventory_leads FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
```

The `UNIQUE (organization_id, location_id)` constraint ensures exactly one lead per location.

---

## Hook: `useLocationInventoryLeads`

New hook in `src/hooks/useLocationInventoryLeads.ts`:

- `useLocationInventoryLeads()` — fetches all assignments for the org, joined with employee profile data (name, photo).
- `useAssignInventoryLead()` — upsert mutation (assign or replace lead for a location).
- `useRemoveInventoryLead()` — delete mutation.
- `useLocationCoverageWarnings()` — compares active locations vs assigned leads, returns uncovered location IDs.

---

## UI Changes

### 1. Inventory Tab — Coverage Warning Banner

In `RetailProductsSettingsContent.tsx`, above the AlertSettingsCard on the Inventory tab:

- Use `useLocationCoverageWarnings()` to check for uncovered locations.
- If uncovered locations exist, render an advisory `EnforcementGateBanner`-style warning (amber, non-blocking) with the message: *"N location(s) have no inventory lead assigned"* and a CTA button linking to the assignment UI.

### 2. Inventory Lead Assignment Card

New component `InventoryLeadAssignmentCard.tsx` in `src/components/dashboard/settings/inventory/`:

- Renders as a Card on the Inventory tab (below or alongside AlertSettingsCard).
- Lists each active location with the currently assigned lead (avatar + name) or an "Unassigned" state.
- Super Admins see a dropdown/dialog to pick a staff member for each location.
- Staff list is filtered to org members at that location (with option to pick any org member).
- Uses existing design tokens (`tokens.card.*`, `tokens.table.columnHeader`, etc.).

### 3. Access Control

- Only `super_admin` and `admin` roles can assign/remove leads (enforced by RLS + UI gating via `useAuth`).
- All org members can view who the lead is.

---

## File Plan

| File | Action |
|---|---|
| Migration SQL | Create `location_inventory_leads` table + RLS |
| `src/hooks/useLocationInventoryLeads.ts` | New — CRUD hooks + coverage check |
| `src/components/dashboard/settings/inventory/InventoryLeadAssignmentCard.tsx` | New — per-location lead assignment UI |
| `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` | Add coverage warning banner + render assignment card on Inventory tab |

