## Context

The Reputation entitlement flag (`organization_feature_flags.reputation_enabled`) is already `true` for **drop-dead-salons** (verified in DB). The reason it isn't appearing yet is purely UI wiring:

- The sidebar **Zura Apps** section's nav config doesn't include a Reputation row.
- `AppsMarketplace.tsx` lists Reputation only inside the "Explore Apps" array with `comingSoon: true` and never reads `useReputationEntitlement`.

Both Connect and Color Bar already follow the canonical entitlement-gated pattern; we mirror it for Reputation. No DB changes, no migrations, no new hook (`useReputationEntitlement` already exists at `src/hooks/reputation/useReputationEntitlement.ts`).

## Changes

### 1. `src/config/dashboardNav.ts`
Add a Reputation row to `appsNavItems` (between Connect and the end). Use `MessageSquarePlus` icon (already imported), pointing at `/dashboard/admin/feedback` — the canonical Reputation hub (`FeedbackHub` already mounts `<ReputationSubscriptionCard />`).

### 2. `src/hooks/useSidebarLayout.ts`
Append `/dashboard/admin/feedback` to `DEFAULT_LINK_ORDER.apps` so the new item shows in the default order for orgs without a stored layout.

### 3. `src/components/dashboard/SidebarNavContent.tsx`
- Import `useReputationEntitlement` alongside the other entitlement hooks.
- Add a row to the `ENTITLEMENT_GATES` array:
  `{ hrefSuffix: '/admin/feedback', entitled: isReputationEntitled }`.
- Existing apps-section "hide if no items remain" logic handles the case where an org without Reputation lands with all three apps gated off.

### 4. `src/pages/dashboard/AppsMarketplace.tsx`
- Import `useReputationEntitlement`.
- Move the `reputation` AppDef from `EXPLORE_APPS` into `SUBSCRIBED_APPS` (drop `comingSoon` / `missedOpportunity`, set `settingsPath: '/admin/feedback'`).
- Extend `getActiveStatus` to map `'reputation' → reputationActive`.
- Include `reputationLoading` in the combined `isLoading` flag.

Result: when entitled, Reputation renders in **Your Apps** with the green "Active" badge and an Open button → `/admin/feedback`. When not entitled, it falls through to **Explore Apps** as Available (still real, no longer "Coming Soon").

## Doctrine alignment

- **Entitlement Governance** (`mem://architecture/entitlement-and-access-governance`): all gated apps must check feature flags via the canonical `use*Entitlement` hook — mirrored exactly.
- **Sidebar Navigation Pathing** (`mem://tech-decisions/sidebar-navigation-path-resolution-convention`): raw `/dashboard/...` paths in `appsNavItems`, resolved by `dashPath()` at render — mirrored exactly.
- **Reputation Subscription Gating** memory: the 5 enforcement layers already exist (UI gate, mutation pre-flight, 402 edge fn, editor disable, stylist silent). This change only adds **navigation visibility**, which the doctrine permits and expects once `reputation_enabled` is true.

## Out of scope

- No subscription/Stripe changes — the org is already entitled.
- No new routes — `admin/feedback` is the canonical Reputation hub today.
- No platform-admin changes.

## Verification after build

1. Sidebar: `Zura Apps` → shows Color Bar, Zura Connect, **Zura Reputation**.
2. `/dashboard/apps` → "Your Apps" shows Reputation with the green Active badge and an "Open" button to `/admin/feedback`.
3. Click Open → lands on FeedbackHub, where the Reputation subscription card already renders.
