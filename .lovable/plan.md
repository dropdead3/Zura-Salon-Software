## Symptom
Refreshing the browser while on a dashboard route lands the user back at `/` (PlatformLanding marketing site) instead of staying on the dashboard.

## Investigation Findings

I traced the full refresh path. The auth + routing chain is structurally sound:

- `AuthContext` correctly uses `getSession()` + `onAuthStateChange` and only flips `authReady = true` after the first session resolution.
- `OrgDashboardRoute` (`/org/:slug/dashboard/*`) explicitly waits for `authReady`, then for org slug resolution, then for membership — and never decides on a transient null. ✓
- `LegacyDashboardRedirect` (`/dashboard/*`) waits for `authReady` and `isOrgLoading`, then redirects to `/org/:slug/dashboard/*`. ✓
- No code in `src/` does `navigate('/')` or `<Navigate to="/" />` from a dashboard route on auth failure — failures route to `/login`, `/no-organization`, or `<NotFound />`.

That means the redirect to marketing is **not** coming from the auth gate logic. There are only three remaining suspects, all worth fixing:

### Suspect 1 — Stale lazy-import chunk after redeploy (most likely on production)
Every dashboard page is `lazyWithRetry(() => import(...))`. When you refresh after a redeploy, the old chunk hash 404s. `src/lib/importWithRetry.ts:67` catches this and calls `window.location.reload()`. If the reload also fails (race with cache), React Router's `<Suspense>` can throw → `ErrorBoundary` catches → `handleGoHome` fires `window.location.assign('/dashboard')` → on production, if `/dashboard` cannot resolve before that ErrorBoundary state somehow recurs, the user clicks or the fallback eventually lands them at `/`. Even short-circuit: `handleGoHome` itself sends to `/dashboard`, not the route they were on.

### Suspect 2 — Browser falling through to `index.html` then mismatched route
On Lovable hosting the SPA fallback always serves `index.html`, so this is fine. Ruling this out for hosting, but worth confirming the user is on `id-preview--*.lovable.app` (where this works) vs a custom domain.

### Suspect 3 — `ErrorBoundary.handleGoHome` is hardcoded to `/dashboard`, not the org-scoped path
This is a real bug: in the new org-scoped URL hierarchy, `/dashboard` is a legacy redirect. If `LegacyDashboardRedirect` fires while `useOrganizationContext` returns `effectiveOrganization = null` (e.g. profile query hasn't completed yet on a slow connection, or the user is a platform user with no selection), it sends you to `/no-organization`. From `/no-organization`, the "Go home" link probably points to `/`.

## Plan — Three coordinated fixes

### 1. Add structured diagnostic logging on the redirect path
Before changing behavior, instrument the two redirect points so the next refresh tells us which gate fired:
- `OrgDashboardRoute`: log `[OrgDashboardRoute] decision` with `{ authReady, hasUser, isLoading, orgSlug, hasOrg, isPlatformUser, membershipReady, isMembershipLoading, isMembershipFetched, isMember }`.
- `LegacyDashboardRedirect`: log `[LegacyDashboardRedirect] decision` with `{ authReady, hasUser, isOrgLoading, hasEffectiveOrg, slug, splat }`.

Logs are dev-only (`if (import.meta.env.DEV)` guard) so production isn't polluted, but the user can confirm in preview console.

### 2. Fix `ErrorBoundary.handleGoHome` to land on the user's actual org dashboard
Replace the hardcoded `/dashboard` with logic that:
1. Reads the current pathname.
2. If it matches `/org/:slug/...`, reload the same URL (don't navigate away).
3. Otherwise, navigate to `/dashboard` (legacy redirect handles slug resolution).

This stops the boundary from kicking authenticated users out to a generic path on render errors.

### 3. Harden chunk-failure recovery so refresh on stale bundles doesn't lose the route
In `src/lib/importWithRetry.ts`:
- Before calling `window.location.reload()`, capture `window.location.href` (already correct).
- Add a single sessionStorage flag (`zura.chunk-reload-attempted`) so we don't infinite-loop reloads if the bundle is genuinely broken.
- After 2 failed reload attempts, surface the ErrorBoundary fallback rather than silently navigating away.

This prevents the silent "land on `/`" path that happens when chunk reloads cascade.

### 4. Verify there's no `<Navigate to="/" />` reachable from auth-failure paths
I scanned and found none, but I'll add an ESLint comment in `AuthContext` and `OrgDashboardRoute` documenting that **dashboard routes must never redirect to `/`** — only to `/login`, `/no-organization`, or `<NotFound />`. Future regressions will be caught at review.

## Files to edit
- `src/components/OrgDashboardRoute.tsx` — add dev-only decision logs
- `src/components/ErrorBoundary.tsx` — make `handleGoHome` org-aware
- `src/lib/importWithRetry.ts` — bounded retry + better failure surface

## Verification
After the fixes, I'll ask you to:
1. Open dev tools console.
2. Navigate to any dashboard page.
3. Refresh.
4. Paste the `[OrgDashboardRoute] decision` / `[LegacyDashboardRedirect] decision` lines.

That will confirm which gate (if any) was firing the bad redirect, and the ErrorBoundary + chunk-retry hardening will prevent the marketing-page landing regardless of cause.

---

**One quick clarification that will accelerate the fix:** when you experience this, what's in the URL bar **before** you hit refresh — is it `/dashboard/...` (legacy) or `/org/<your-slug>/dashboard/...` (new format)? If it's the legacy `/dashboard`, this is almost certainly the org-context hydration gap; if it's already org-scoped, it's the chunk-reload path.