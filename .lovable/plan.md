

# Zura Capital Control Tower — Platform Feature (Not an App)

## Problem

Zura Capital is currently listed alongside Color Bar, Connect, and Payroll in the "Apps in Use" card on account pages. Capital is not a subscription app — it's a platform-controlled feature with gated access. It needs its own dedicated control surface.

## What Changes

### 1. Remove Capital from AccountAppsCard
**File:** `src/components/platform/account/AccountAppsCard.tsx`
- Delete lines 164–188 (the Zura Capital toggle row)
- Remove `Landmark` import and `capitalFlag`/`isCapitalEnabled` variables

### 2. Add "Special Features" nav group to platform sidebar
**File:** `src/config/platformNav.ts`
- Add a new nav group between "Products" and "Admin":
```ts
{
  label: 'Special Features',
  items: [
    { href: '/platform/capital', label: 'Zura Capital', icon: Landmark, platformRoles: ['platform_owner', 'platform_admin'] },
  ],
}
```

### 3. Create Capital Control Tower page
**File:** `src/pages/platform/CapitalControlTower.tsx` (new)

A dedicated platform page with:

- **Header**: "Zura Capital Control Tower" with description "Manage Capital access and monitor funded activity across the platform"
- **Organization Access Table**: Lists all organizations with a toggle to enable/disable `capital_enabled` per org. Shows org name, slug, current status (Active/Inactive), and a switch. Uses the existing `useUpdateOrgFeatureFlag` mutation pattern.
- **Beta Rollout Summary**: A stats row showing total orgs with Capital enabled, total active opportunities across all enabled orgs, and total funded projects
- **Activity Feed** (Phase 2 placeholder): Reserved section for cross-org capital event monitoring

### 4. Add route in App.tsx
**File:** `src/App.tsx`
- Add route: `<Route path="capital" element={<CapitalControlTower />} />` inside the platform route group, gated to platform roles

## Scope

| File | Change |
|---|---|
| `src/components/platform/account/AccountAppsCard.tsx` | Remove Capital toggle row |
| `src/config/platformNav.ts` | Add "Special Features" group with Capital link |
| `src/pages/platform/CapitalControlTower.tsx` | New page — org access table with per-org toggles + summary stats |
| `src/App.tsx` | Add `/platform/capital` route |

## Technical Notes

- The per-org toggle reuses `useUpdateOrgFeatureFlag` — same mutation pattern as the removed AccountAppsCard toggle
- The org list queries `organizations` table joined with `organization_feature_flags` where `flag_key = 'capital_enabled'`
- Platform styling uses `PlatformCard`, `PlatformBadge`, `PlatformButton` components consistent with other platform pages
- Access restricted to `platform_owner` and `platform_admin` roles

