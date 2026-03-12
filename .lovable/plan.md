

# Default Inventory Lead to Manager Role

## Summary

When no inventory lead is explicitly assigned for a location, the system will auto-resolve the location's manager (from `user_roles` where `role = 'manager'` cross-referenced with `employee_profiles.location_id/location_ids`) as the default lead. Super Admins can override this by explicitly assigning any staff member.

## Changes

### 1. Hook: `useLocationInventoryLeads.ts`

- Add a new helper `useLocationDefaultLeads()` that queries `user_roles` (role = `manager`) joined with `employee_profiles` to find which managers are assigned to which locations (via `location_id` / `location_ids` fields).
- Update `useLocationCoverageWarnings()` to consider a location "covered" if it has either an explicit lead OR a default manager.

### 2. UI: `InventoryLeadAssignmentCard.tsx`

- For each location, show the resolved lead with priority: **explicit assignment > default manager**.
- When showing a default manager, display a "(Default — Manager)" badge/label so it's clear this is role-based, not a manual override.
- The Select dropdown remains available to override to any staff member.
- Add a "Reset to default" action when an explicit override exists, which removes the explicit assignment (reverting to manager fallback).

### 3. Coverage Banner

- Update the banner logic: a location is only "uncovered" if it has neither an explicit lead NOR a manager assigned to that location. This means organizations with managers at every location will see zero warnings by default.

## File Plan

| File | Action |
|---|---|
| `src/hooks/useLocationInventoryLeads.ts` | Add `useLocationDefaultLeads()` hook; update coverage logic |
| `src/components/dashboard/settings/inventory/InventoryLeadAssignmentCard.tsx` | Show default manager with badge; add "Reset to default" button; merge explicit + default leads |

No database changes needed — the existing `location_inventory_leads` table handles explicit overrides, and manager resolution is read from existing `user_roles` + `employee_profiles` tables.

