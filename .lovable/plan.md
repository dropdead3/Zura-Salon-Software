

# Bug Fix: Supply Library Dialog Not Opening

## Root Cause
`BackroomProductCatalogSection` uses `effectiveOrganization?.id` directly from `useOrganizationContext()`, but for platform users who also own an organization, `effectiveOrganization` is `null`. Other backroom components use the `useBackroomOrgId()` hook which falls back to the user's `employee_profiles.organization_id`.

This means:
- `orgId` is `undefined`
- The products query never runs (but shows empty state, not a spinner)
- The `{orgId && <SupplyLibraryDialog />}` guard prevents the dialog from ever mounting
- Clicking "Supply Library" sets state to `true` but there's nothing to render

## Fix
Replace `effectiveOrganization?.id` with `useBackroomOrgId()` in `BackroomProductCatalogSection.tsx` — the same pattern used by all other backroom settings components.

### `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`
- Import `useBackroomOrgId` from `@/hooks/backroom/useBackroomOrgId`
- Replace `const { effectiveOrganization } = useOrganizationContext()` + `const orgId = effectiveOrganization?.id` with `const orgId = useBackroomOrgId()`
- Remove unused `useOrganizationContext` import

One file, three-line change.

