

# Add "Apps in Use" Card to Organization Overview

## What
Add a new card below (or alongside) "Business Integrations" on the organization overview page that shows which additional apps are enabled for that organization. Currently the only app is **Zura Backroom**.

## How

### New Component: `AccountAppsCard.tsx`
Create `src/components/platform/account/AccountAppsCard.tsx`:
- Accepts `organizationId` prop
- Queries `organization_feature_flags` for `flag_key = 'backroom_enabled'` and `is_enabled = true`
- Queries `backroom_location_entitlements` for active location count (to show detail)
- Renders a card titled "Apps in Use" with each app as a row:
  - **Zura Backroom**: icon (e.g. `Box` or `Package`), name, active location count, status badge (Active / Not Enabled)
- Uses the same `PlatformCard` / `PlatformBadge` pattern as `AccountIntegrationsCard`
- Designed to be extensible — future apps just add another row

### Update `AccountDetail.tsx`
- Import and render `<AccountAppsCard organizationId={organization.id} />` on the Overview tab, below `AccountIntegrationsCard`

### Data Flow
```text
organization_feature_flags (backroom_enabled, is_enabled)
  + backroom_location_entitlements (active count)
  → AccountAppsCard UI
```

No database changes needed — all data already exists.

