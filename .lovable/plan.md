

# Wire Network Dashboard into Platform Admin

## What It Does

Adds the Zura Network Dashboard as a new platform admin route at `/platform/network`, creates a thin page wrapper following the existing platform page pattern, registers it in the sidebar navigation, and adds the lazy import + route in `App.tsx`.

## Changes

| File | Change |
|---|---|
| `src/pages/dashboard/platform/Network.tsx` | New page wrapper using `PlatformPageContainer` + `PlatformPageHeader` + renders `NetworkDashboard` |
| `src/App.tsx` | Add lazy import for Network page; add `<Route path="network">` under `/platform` with `requirePlatformRole="platform_admin"` |
| `src/config/platformNav.ts` | Add `{ href: '/platform/network', label: 'Zura Network', icon: Building2 }` to the "Intelligence" group, restricted to `platform_owner` and `platform_admin` |

## Build Order

1. Create `src/pages/dashboard/platform/Network.tsx` — thin wrapper importing `NetworkDashboard`
2. Add lazy import + route in `App.tsx`
3. Add nav entry in `platformNav.ts`

