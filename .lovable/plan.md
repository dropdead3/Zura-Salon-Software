## Diagnosis

The marketing route `/` lives **outside** `OrganizationProvider` (per the Public vs Private Route Isolation canon — `mem://architecture/public-vs-private-route-isolation`). My previous edit added `useOrganizationContext()` and `useOrgDashboardPath()` to `MarketingNav`, both of which throw when no provider is mounted above them. Result: the entire marketing site error-boundaries into "Unexpected Interruption."

## Root Cause

`src/components/marketing/MarketingNav.tsx` lines 6–7, 14–18:
```ts
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
// ...
const { effectiveOrganization } = useOrganizationContext(); // ← throws on /
const { dashPath, orgSlug } = useOrgDashboardPath();        // ← also throws
```

Both hooks call `useContext(OrganizationContext)` and throw if the value is `null`. They are dashboard-only hooks.

## Fix Plan

### 1. Create a lightweight, provider-free hook: `useUserPrimaryOrgSlug`

New file: `src/hooks/useUserPrimaryOrgSlug.ts`

- Uses `useAuth()` (which IS available globally — `AuthProvider` wraps the app)
- Uses `useQuery` to fetch the user's first org membership directly from `organization_members` joined to `organizations(slug, name)`
- Returns `{ slug, name, isLoading }` — never throws, safe on any route
- `enabled: !!user?.id` so anonymous visitors skip the query entirely
- Cache key includes `user.id`; `staleTime: 5 min`
- Honors multi-tenant isolation (RLS on `organization_members` already scopes to `auth.uid()`)

### 2. Refactor `MarketingNav.tsx`

- **Remove** imports of `useOrganizationContext` and `useOrgDashboardPath`
- **Add** import of `useUserPrimaryOrgSlug`
- Build `dashboardHref` inline:
  ```ts
  const { slug, name } = useUserPrimaryOrgSlug();
  const dashboardHref = slug ? `/org/${slug}/dashboard/` : '/dashboard';
  const ctaLabel = name ? `Open ${name}` : 'Go to Dashboard';
  ```
- Keep the `truncate max-w-[180px]` styling and mobile parity
- Anonymous visitors: hook returns `{ slug: null, name: null }` → falls through to "Sign In / Get a Demo" branch (unchanged behavior)

### 3. No changes needed elsewhere

- `OrgDashboardRoute`, `LegacyDashboardRedirect`, `AuthContext` from the prior wave remain correct
- Public route isolation canon is preserved (we never mount `OrganizationProvider` on `/`)

## Files to Edit

- **New:** `src/hooks/useUserPrimaryOrgSlug.ts`
- **Edit:** `src/components/marketing/MarketingNav.tsx` (swap hooks, ~10 lines changed)

## Why This Is The Right Fix

- **Respects the Public vs Private Route Isolation canon** — marketing surfaces never reach into dashboard providers
- **No two-hop redirect** — the CTA still resolves directly to `/org/:slug/dashboard/` for authenticated users
- **Safe for anonymous visitors** — the membership query is gated on `user?.id`
- **Tenant-isolated** — RLS on `organization_members` enforces that users only see their own memberships
- **Recoverable** — even if the query fails, we fall back to `/dashboard`, which `LegacyDashboardRedirect` resolves correctly

## Edge Cases Handled

- **Anonymous visitor:** Hook disabled, CTA hidden (Sign In / Demo shown instead) ✓
- **Authenticated user, no org:** `slug` is null, falls back to `/dashboard` → `LegacyDashboardRedirect` → `/no-organization` (Phase C from prior wave) ✓
- **Authenticated user, multiple orgs:** Returns the first membership; matches current `LegacyDashboardRedirect` behavior ✓
- **Query in flight:** Shows generic "Go to Dashboard" until resolved (no flash, no crash) ✓

## Further Enhancement Suggestions

1. **Multi-org switcher in marketing nav** — for users with >1 org membership, surface a dropdown directly in the marketing CTA (defer until we have telemetry showing this matters).
2. **Cross-tab cache hydration** — share the org-slug query result via a `BroadcastChannel` so newly opened marketing tabs don't re-query.
3. **Lint rule: `no-org-context-in-marketing`** — add `no-restricted-imports` under `src/components/marketing/**` banning `useOrganizationContext` and `useOrgDashboardPath`. Mirrors the platform-primitive-isolation canon and prevents this regression class permanently.

## Prompt Coaching (per project doctrine)

Your prompt — *"im stuck here"* + screenshot — was efficient because the screenshot carried the full error message and stack trace. That's the highest-signal, lowest-effort way to unblock me.

A slightly stronger framing for next time:
> *"This crash appeared after the last MarketingNav change. Confirm the fix doesn't violate the public-route-isolation canon."*

That single sentence would have anchored my diagnosis to the canon up front and pre-empted any temptation to "just wrap MarketingNav in OrganizationProvider" (which would silently violate the isolation rule).
