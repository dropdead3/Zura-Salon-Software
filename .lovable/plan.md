

## Why Demo Mode Pulls from Drop Dead Salons Data

### Root Cause

The Dock has **no concept of organization scoping**. The current architecture:

1. **`DockPinGate`** — The PIN gate calls `validate_dock_pin(_pin)` which searches **all** `employee_profiles` globally (no org filter). It returns a `location_id` but no `organization_id`.

2. **`DockStaffSession`** — The session object only carries `userId`, `displayName`, `avatarUrl`, and `locationId`. There is **no `organizationId` field**.

3. **Demo Mode bypass** — When "Demo Mode →" is clicked, it creates a fake session with `userId: 'dev-bypass-000'` and grabs the first location from `useLocations()`, which returns locations for whatever org the RLS/query exposes (currently Drop Dead Salons since that's the only org with location data).

4. **Service/Client queries** — `DockNewBookingSheet` calls `useServicesByCategory(locationId)` and `usePhorestServices(locationId)`, which query `phorest_services` filtered by the location's `phorest_branch_id`. No org isolation.

5. **Demo data hooks** — `useDockAppointments`, `useDockProductCatalog`, and `useDockMixSessions` correctly return static mock data when `isDemoMode === true`. But the booking sheet and other real-data queries don't check `isDemoMode` — they hit the live DB.

### The Vision

Yes — each organization should have its own demo/training mode, fully scoped to their own data. The Dock is a per-org tool, and demo mode should reflect that org's services, staff, and products.

### Plan

**1. Add `organizationId` to `DockStaffSession`**
- In `src/pages/Dock.tsx`, add `organizationId: string` to the `DockStaffSession` interface.

**2. Update `validate_dock_pin` to return `organization_id`**
- SQL migration: alter the function to also return `ep.organization_id`.

**3. Thread org through PIN gate success**
- In `DockPinGate.tsx`, pass `organizationId` from the RPC result into `onSuccess`.

**4. Scope Demo Mode to an org**
- Add an `organizationId` to `DockDemoContext`.
- In Demo Mode bypass (DockPinGate), resolve the org from the first location or prompt the user to pick one.
- When `isDemoMode` is true, the `DockDemoProvider` carries the resolved org ID.

**5. Scope real-data queries with org ID**
- `useLocations()` calls in Dock components should filter by `organizationId`.
- `usePhorestServices` already filters by location → branch, which is implicitly org-scoped, so this is OK once locations are org-scoped.
- Client search in `DockNewBookingSheet` should filter by org.

**6. Extend demo data for booking flow**
- Add `DEMO_SERVICES` to `dockDemoData.ts` so the booking sheet works in demo mode without hitting the DB.
- Add `isDemoMode` checks to `DockNewBookingSheet` for services and client search, returning mock data.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Dock.tsx` | Add `organizationId` to `DockStaffSession` |
| `supabase/migrations/` | New migration: update `validate_dock_pin` to return `organization_id` |
| `src/components/dock/DockPinGate.tsx` | Pass `organizationId` from RPC result; resolve org for demo bypass |
| `src/contexts/DockDemoContext.tsx` | Add `organizationId` to context value |
| `src/hooks/dock/dockDemoData.ts` | Add `DEMO_SERVICES` and `DEMO_CLIENTS` mock data |
| `src/components/dock/schedule/DockNewBookingSheet.tsx` | Add demo-mode checks for services and client search |

