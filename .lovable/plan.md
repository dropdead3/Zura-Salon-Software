

# Phase 1.5: Quick Activate Toggle + Apps Sidebar Entry for Zura Connect

## What We Are Building

Two enhancements to the Zura Connect infrastructure:

1. **Quick activate toggle** in `AccountAppsCard` — platform admins can flip `connect_enabled` on/off directly from the account detail page, matching the pattern used for other app toggles
2. **Sidebar Apps section entry** — add Zura Connect to the `appsNavItems` array so it appears in the "Apps" sidebar section alongside Color Bar, with conditional visibility based on the `connect_enabled` flag

## Changes

### 1. AccountAppsCard — add toggle switch (`src/components/platform/account/AccountAppsCard.tsx`)

- Import `Switch` from `@/components/ui/switch`
- Import `useUpdateOrgFeatureFlag` from `@/hooks/useOrganizationFeatureFlags`
- Replace the static `PlatformBadge` for Zura Connect with a `Switch` + badge combo (same as Color Bar should eventually have)
- On toggle: call `useUpdateOrgFeatureFlag` with `flagKey: 'connect_enabled'` and the new value
- Show loading/disabled state while mutation is in flight
- Also add the same toggle pattern to the Color Bar row for consistency

### 2. Sidebar Apps entry (`src/config/dashboardNav.ts`)

- Add Zura Connect to `appsNavItems`:
```text
{ href: '/dashboard/team-chat', label: 'Zura Connect', icon: MessageSquare, permission: 'manage_settings' }
```

### 3. Remove Connect from Main nav section

- Currently Connect sits in `mainNavItems` (line 78). Move it out — it belongs in `appsNavItems` since it's a subscription add-on, not a core nav item. Non-entitled orgs should not see it in the main section.
- The `ConnectSubscriptionGate` inside the page still serves as a fallback if someone navigates directly.

### 4. Conditional sidebar visibility

- The sidebar already conditionally shows the "Apps" section based on whether the org has any active app flags. Verify the existing logic in `SidebarNavContent.tsx` handles this (if both Color Bar and Connect are disabled, the Apps section hides entirely). If not, add `connect_enabled` to the visibility check.

## Files

| File | Change |
|------|--------|
| `src/components/platform/account/AccountAppsCard.tsx` | Add Switch toggles for Connect and Color Bar activation |
| `src/config/dashboardNav.ts` | Move Connect from `mainNavItems` to `appsNavItems`; add MessageSquare import |
| `src/components/dashboard/SidebarNavContent.tsx` | Verify Apps section visibility includes `connect_enabled` (update if needed) |

## Not Included

- Stripe subscription flow (Phase 2 — will require product/price creation, checkout edge function, and subscription verification)
- Self-service activation UI for end-org admins

