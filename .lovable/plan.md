# Fix Refresh-To-Marketing-Page Bug

## Root Cause

On hard refresh of `/org/:slug/dashboard/*`, three races collide:

1. **Double session processing** — `onAuthStateChange` and `getSession()` both fire `processSession`, with the second call cancelling the first's role/permission fetch via `requestVersionRef`. The `loading` flag drops to `false` only after the second pass completes.
2. **`LegacyDashboardRedirect` fall-through** — when `effectiveOrganization` is null but `isOrgLoading` is briefly `false` (between query mount and hydration), it bounces the user to `/login` with an "advisory" message, losing their dashboard URL.
3. **`OrgDashboardRoute` membership check** — the `enabled` flag flips on/off as `orgId` and `userId` resolve out of order, so the membership query briefly reports `isMember = false` before refetching.

The cumulative effect: a user on `/org/redken/dashboard/admin/analytics` refreshes, the app spends ~200ms in a "no auth, no org, no membership" state, and one of the guards wins and ships them to `/login` (which on production lands at the marketing site).

## Phase A — Auth Gate Hardening (`src/contexts/AuthContext.tsx`)

Add an explicit **`authReady`** signal separate from `loading`:

- `loading` = something is in flight (current behaviour)
- `authReady` = the FIRST session resolution has completed (success or null), regardless of subsequent revalidations

```ts
const [authReady, setAuthReady] = useState(false);

// Inside processSession's .then() and the empty-session branch:
setAuthReady(true);
setLoading(false);
```

- Deduplicate the initial double-call: track whether `processSession` has been invoked since mount; the `getSession()` follow-up becomes a no-op if `onAuthStateChange` already fired with the same session token.
- Expose `authReady` on the context value.

## Phase B — Harden Redirect Guards

### `src/components/OrgDashboardRoute.tsx` (`LegacyDashboardRedirect`)

Replace the current early-exit ladder with strict ordering:

```
1. if (!authReady) → spinner
2. if (!user) → /login with from:location preserved
3. if (orgContext.isLoading || !userOrganizations resolved) → spinner
4. if (effectiveOrganization?.slug) → Navigate to /org/:slug/dashboard/*
5. else → Navigate to /no-organization (NEW page, see Phase C)
```

The key change: **never redirect on a transient null org**. Only decide once `userOrganizations` has actually returned (length 0 vs length ≥ 1).

### `src/components/OrgDashboardRoute.tsx` (`OrgDashboardRoute`)

- Wait for `authReady` AND organization query resolution before evaluating membership.
- Treat `isMembershipLoading || !orgId || !userId` as "still resolving" (spinner), not "denied".
- Only render `<OrgAccessDenied />` once the membership query has actually returned `false` for a real, resolved `(orgId, userId)` pair.

### `src/components/auth/ProtectedRoute.tsx`

Swap `loading` for `authReady` in the spinner gate so a background revalidation doesn't trigger a redirect cascade:

```ts
const authOrPermissionsLoading = !authReady || ...;
```

## Phase C — Dedicated `/no-organization` Page (Option B)

Create `src/pages/NoOrganization.tsx`:

- Calm, advisory copy following the doctrine: *"Your account isn't linked to an organization yet. Reach out to your account owner or administrator to be added."*
- Shows the signed-in email (so they know which account they're on).
- Two actions: **Contact your administrator** (mailto / copy-email helper) and **Sign out**.
- Uses `tokens.empty.*` and `font-display` heading per the UI canon. No marketing chrome, no sidebar.

Register the route in `src/App.tsx` as a public-but-authenticated route (renders only when `user` exists but no org resolves). Keep it outside the `OrganizationProvider`-dependent dashboard tree so it can't recursively trigger the same redirect.

## Phase D — Preserve URL Through Login Bounce

When a genuinely unauthenticated user hits a dashboard URL, ensure `state.from.pathname` carries the full org-scoped path (already done in `LegacyDashboardRedirect`, verify in `OrgDashboardRoute` and `ProtectedRoute`). After login, `LoginPage` should honour `from.pathname` instead of defaulting to `/dashboard`.

## Files Touched

- `src/contexts/AuthContext.tsx` — add `authReady`, dedupe double-init
- `src/components/OrgDashboardRoute.tsx` — strict gate ordering in both components
- `src/components/auth/ProtectedRoute.tsx` — gate on `authReady`
- `src/pages/NoOrganization.tsx` — **new** dedicated dead-end page
- `src/App.tsx` — register `/no-organization` route
- `src/pages/LoginPage.tsx` (or equivalent) — verify `from.pathname` honoured

## Verification

1. Sign in, navigate to `/org/:slug/dashboard/admin/analytics`, hard refresh → stays on the same page (no marketing flash).
2. Sign in as a user with no org → lands on `/no-organization` (not `/login`).
3. Sign out from any dashboard URL → goes to `/login` cleanly, then back to the original URL after sign-in.
4. Slow network throttling (Fast 3G) → spinner persists, no premature redirect.

## Doctrine Anchors

- **Loader Unification** — all transient states use `BootLuxeLoader` (boot/auth gate) per `mem://style/loader-unification`.
- **Multi-tenant URL Hierarchy** — preserves `/org/:slug/dashboard/*` shape per `mem://architecture/multi-tenant-url-hierarchy`.
- **Public/Private Route Isolation** — `/no-organization` lives outside the dashboard provider tree per `mem://architecture/public-vs-private-route-isolation`.
- **Copy Governance** — advisory tone on the dead-end page, no shame language.
