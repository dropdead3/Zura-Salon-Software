

## What you're seeing

The disco Z grid (`ZuraLoader`) is still hardcoded in spots that bypass our `DashboardLoader` config. When we shipped the Luxe loader, we updated section/page loaders inside the dashboard — but **route-shell** and **bootstrap** loaders were never converted. Those are exactly what shows during the longest waits (org resolution, app boot), so it feels like nothing changed.

## Where it still lives

| Surface | File | What renders |
|---|---|---|
| App boot (pre-React) | `src/main.tsx` × 2 | `<ZuraLoader size="lg" platformColors />` |
| Org route resolution | `src/components/OrgDashboardRoute.tsx` × 4 | `<ZuraLoader size="lg" platformColors />` |
| Platform team manager | `src/components/platform/PlatformTeamManager.tsx` | `<ZuraLoader size="xl" platformColors />` |
| Pending invitations | `src/components/platform/PendingInvitationsSection.tsx` | `<ZuraLoader size="xl" platformColors />` |
| Color Bar entitlements | `src/components/platform/color-bar/ColorBarEntitlementsTab.tsx` | `<ZuraLoader size="xl" platformColors />` |

The `LOADER_MAP` in `DashboardLoader` defaults to `LuxeLoader`, so anywhere using `<DashboardLoader />` is already calm. These 9 hardcoded call sites are the holdouts.

## Fix

### 1. Bootstrap (`main.tsx`)
Swap the disco Z grid for an inline LuxeLoader-equivalent (small static Z mark + thin sliding bar). Can't import the React component before React mounts, so we'll inline the same DOM/CSS — keeps it framework-free and matches the in-app loader visually.

### 2. Org route shell (`OrgDashboardRoute.tsx`)
Replace 4 hardcoded `<ZuraLoader>` with `<DashboardLoader fullPage />` so it honors the platform's loader-style preference (Luxe by default).

### 3. Platform admin holdouts (3 files)
Replace inline `<ZuraLoader size="xl" platformColors />` with `<LuxeLoader size="lg" />` directly — platform admin doesn't use `DashboardLoader` (different layout system per platform-component-governance), so we go straight to LuxeLoader.

### 4. Doctrine update
Update the JSDoc in `DashboardLoader.tsx` to clarify: the disco Z grid is **off by default**. It only renders when an operator explicitly chooses "Zura" in branding settings. Bootstrap and route shells should never hardcode it.

## Out of scope
- Removing `ZuraLoader` entirely — it's still a valid opt-in for operators who want the brand-forward feel
- Sweeping every minor loader call site — only the high-visibility ones the user actually sees

## Verification signal
- Hard refresh `/dashboard` in dark mode → bootstrap shows small Z + thin bar (Luxe), no disco grid
- Navigate to `/org/<slug>/dashboard` → org-resolution loader shows Luxe, not disco grid
- Platform admin → Team / Invitations / Color Bar Entitlements → calm Luxe loader
- Operators who explicitly set "Zura" loader in branding still get disco — opt-in preserved

## Ship order
1. Bootstrap inline loader in `main.tsx`
2. `OrgDashboardRoute` × 4 → `DashboardLoader fullPage`
3. Platform admin × 3 → `LuxeLoader`
4. JSDoc update

