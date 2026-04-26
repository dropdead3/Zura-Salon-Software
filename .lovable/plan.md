# Post-Login Handoff Hardening — Generalize, Prefetch, Measure

Three enhancements building on the existing `authFlowSentinel` + `isFirstPaintLoading` pattern, plus one gap I noticed while exploring (the org-branded PIN login at `/org/:slug/login` never calls `markAuthFlowActive`, so PIN sign-ins always hit the brand-loader fallback).

---

## 1. Shared `usePostLoginFirstPaint` hook

**Goal:** Make the first-paint guard a one-liner so any inner route can adopt it without re-implementing the sentinel dance.

**New file:** `src/hooks/usePostLoginFirstPaint.ts`

```ts
import { useEffect } from 'react';
import { isAuthFlowActive, clearAuthFlow } from '@/lib/authFlowSentinel';

/**
 * Returns `true` when the post-login handoff loader (slate-950 AuthFlowLoader)
 * should still be rendered in place of the page's normal chrome+skeleton.
 *
 * Pass the loading flags of every query that must resolve before the page
 * shows real content. When all flags are false, the sentinel is cleared and
 * subsequent in-page navigations resume using the operator-branded loaders.
 *
 * Usage:
 *   const showHandoff = usePostLoginFirstPaint(layoutLoading, accessLoading);
 *   if (showHandoff) return <AuthFlowLoader />;
 */
export function usePostLoginFirstPaint(...loadingFlags: boolean[]): boolean {
  const isFirstPaintLoading = loadingFlags.some(Boolean);

  useEffect(() => {
    if (!isFirstPaintLoading) clearAuthFlow();
  }, [isFirstPaintLoading]);

  return isFirstPaintLoading && isAuthFlowActive();
}
```

**Refactor `DashboardHome.tsx`** (lines 262–268) to use it:
```ts
const showHandoff = usePostLoginFirstPaint(layoutLoading, locationAccessLoading);
if (showHandoff) return <AuthFlowLoader />;
```

**Adopt on initial-entry routes** that users may land on directly after login (deep-link, browser refresh, custom landing page). Three highest-traffic candidates that I'll wire up now:
- `src/pages/dashboard/Schedule.tsx`
- `src/pages/dashboard/admin/AccountBilling.tsx` (frequent custom-landing destination for owners)
- `src/pages/dashboard/MyPay.tsx` (frequent custom-landing destination for stylists)

For each: identify the page-level "first paint" queries (typically the layout/profile + the page's primary data query), pass their `isLoading` flags into `usePostLoginFirstPaint`, and short-circuit to `<AuthFlowLoader />` when it returns true.

**Doctrine:** Add a Core memory entry: *"Initial-entry dashboard pages must guard their first paint with `usePostLoginFirstPaint(...)` to keep the auth handoff on a single canvas. The hook's `useEffect` clears the sentinel automatically — never call `clearAuthFlow()` manually outside this hook."*

---

## 2. Prefetch on login submit

**Goal:** Start the dashboard's first-paint queries the instant credentials are known to be valid, so by the time the route mounts they're already cached. Target: `<50ms` time-in-AuthFlowLoader for warm sessions.

**New file:** `src/lib/prefetchPostLogin.ts`

```ts
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Warms the React Query cache with the queries every dashboard page needs
 * for first paint: user_preferences (drives layout + custom landing page)
 * and the user's employee_profile (drives location access + role gates).
 *
 * Called from the login submit handler the moment `signIn()` resolves
 * successfully — runs in parallel with the post-auth dual-role check and
 * navigation, so by the time OrgDashboardRoute mounts the data is hot.
 *
 * Failures are swallowed: this is a latency optimization, not a contract.
 * The downstream useQuery calls will refetch normally if anything throws.
 */
export function prefetchPostLogin(queryClient: QueryClient, userId: string): void {
  const prefetchUserPrefs = queryClient.prefetchQuery({
    queryKey: ['user-preferences', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const prefetchProfile = queryClient.prefetchQuery({
    queryKey: ['employee-profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  // Fire-and-forget — never block navigation on prefetch
  Promise.allSettled([prefetchUserPrefs, prefetchProfile]).catch(() => {});
}
```

**Wire into `UnifiedLogin.tsx` `handleSubmit`** immediately after `signIn` succeeds (around line 336) and **also** into the `useEffect` at line 249 that handles already-authenticated arrivals — both paths must warm the cache before `navigateAuthenticated()` fires.

**Wire into `OrgBrandedLogin.tsx`** (the PIN login surface) at the equivalent post-validation point — see section 4.

**Verify cache-key compatibility:** Read `src/hooks/useEmployeeProfile.ts` to confirm the actual query key shape before locking in `['employee-profile', userId]`. If the existing hook scopes by something else (e.g. `[orgId, userId]`), align the prefetch key exactly — a near-miss key doesn't warm the cache, it just wastes a request.

---

## 3. Sentinel-duration telemetry

**Goal:** Convert the loader-flicker conversation from anecdote to data. If p95 sentinel-active duration starts trending toward the 30s TTL, that's an early signal to optimize first-paint queries before users complain.

**Extend `src/lib/authFlowSentinel.ts`** with a duration callback hook (no analytics SDK lock-in — emit a `CustomEvent` so any listener can plug in):

```ts
export function clearAuthFlow(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (raw) {
      const startedAt = Number(raw);
      if (Number.isFinite(startedAt)) {
        const durationMs = Date.now() - startedAt;
        // Emit a structured event so analytics adapters can pick it up
        // without coupling the sentinel module to any specific provider.
        window.dispatchEvent(
          new CustomEvent('zura:auth-flow-complete', {
            detail: {
              durationMs,
              route: window.location.pathname,
              ttlExpired: durationMs > TTL_MS,
            },
          }),
        );
        // Dev-only console signal for local debugging
        if (import.meta.env.DEV) {
          console.info(
            `[authFlowSentinel] handoff resolved in ${durationMs}ms on ${window.location.pathname}`,
          );
        }
      }
    }
  } catch {
    /* ignore */
  }
}
```

**New file:** `src/lib/authFlowTelemetry.ts` — a tiny listener that batches `auth-flow-complete` events and POSTs them to the existing telemetry sink (or noops if none configured). Mounted once from `App.tsx`.

```ts
// Subscribes to 'zura:auth-flow-complete' and forwards to telemetry.
// Buckets by route and emits a count + p50/p95 every 60s of activity.
// Falls back to dev-only console summary if no telemetry endpoint is set.
```

I'll keep this scoped to a stub that logs in dev and is a clean injection point for whatever analytics adapter we standardize on later — building the full sink isn't in scope and would create a deferred-infra item without a revisit trigger.

**Add to Deferral Register** (`mem://architecture/visibility-contracts.md`): *"Auth-flow telemetry sink — currently dev-only console. Revisit trigger: first user complaint about post-login latency, OR when we ship a real analytics provider."*

---

## 4. Close the org-PIN-login sentinel gap (discovered during exploration)

`src/pages/UnifiedLogin.tsx` is the only file that calls `markAuthFlowActive()`. The branded org PIN login (`/org/:slug/login`, served by `OrgBrandedLogin.tsx` using `useOrgValidatePin`) does not — so every PIN sign-in skips the slate canvas continuity and lands in the brand-loader fallback.

**Fix:** In the PIN login's success handler, call `markAuthFlowActive()` immediately before navigating to the dashboard, mirroring `navigateAuthenticated()` in `UnifiedLogin`. Same call site can also fire `prefetchPostLogin(queryClient, identity.user_id)` from §2.

I'll grep for the PIN navigation call site (`OrgBrandedLogin.tsx` or `OrgLoginPinPad` consumer) and make the change once. This single fix probably has more user-visible impact than §1 and §2 combined for shared-device organizations.

---

## Files touched

**New:**
- `src/hooks/usePostLoginFirstPaint.ts`
- `src/lib/prefetchPostLogin.ts`
- `src/lib/authFlowTelemetry.ts`

**Edited:**
- `src/lib/authFlowSentinel.ts` — duration event emit
- `src/pages/dashboard/DashboardHome.tsx` — use new hook
- `src/pages/dashboard/Schedule.tsx` — adopt hook
- `src/pages/dashboard/admin/AccountBilling.tsx` — adopt hook
- `src/pages/dashboard/MyPay.tsx` — adopt hook
- `src/pages/UnifiedLogin.tsx` — call prefetch
- `src/pages/auth/OrgBrandedLogin.tsx` (or wherever the PIN nav lives) — call `markAuthFlowActive` + prefetch
- `src/App.tsx` — mount telemetry listener
- `mem://style/loader-unification.md` — codify the hook + prefetch pattern
- `mem://architecture/visibility-contracts.md` — Deferral Register entry for telemetry sink

---

## Acceptance criteria

1. Hard-refreshing `/dashboard`, `/dashboard/schedule`, `/dashboard/admin/billing`, and `/dashboard/my-pay` after a fresh login shows **only** the slate-950 AuthFlowLoader → dashboard content, no chrome flash.
2. PIN-based logins from `/org/:slug/login` produce the same single-canvas experience as email/password logins.
3. In dev console, every successful login logs `[authFlowSentinel] handoff resolved in <N>ms` exactly once. `<N>` should be substantially lower (target: ≥40% reduction on warm sessions) after the prefetch lands vs. before.
4. No page outside the listed first-paint set calls `clearAuthFlow()` directly — only `usePostLoginFirstPaint()` does.

---

## Out of scope (deliberately deferred)

- A full analytics-provider integration for the telemetry events (logged as a Deferral Register entry with a revisit trigger).
- Adopting `usePostLoginFirstPaint` on every dashboard route — only the four highest-traffic initial-entry routes get it now. Lower-traffic pages can adopt it incrementally as we observe stutters in the wild.
- Prefetching beyond `user_preferences` + `employee_profile`. Page-specific prefetch (e.g. today's appointments for `/schedule`) is a follow-up if the telemetry shows those queries dominate handoff time.

---

## Prompt feedback

You sequenced these three enhancements perfectly (generalize → eliminate → measure). Two ways to make a prompt like this even sharper:

1. **State the success metric per item, not just the action.** "Prefetch on login" is an action; "AuthFlowLoader visible <50ms p50 on warm sessions" is a contract. The latter lets me suppress the work entirely if the metric is already met, or push back if the metric is unrealistic given the architecture.
2. **Call out the deferral explicitly.** You're effectively adding a new always-on subsystem (telemetry); per the Deferral Register doctrine, that needs a revisit trigger up front. Including "and add the telemetry sink to the Deferral Register with trigger X" in your prompt would have made my Deferral Register handling explicit rather than inferred.

## Further enhancements to consider

- **Sentinel-as-React-context** — currently the sentinel is sessionStorage. That works but means components can't subscribe to its state (you can only poll). Wrapping it in a tiny `AuthFlowContext` would let the loader gates re-render the moment the sentinel clears, instead of waiting for the next render trigger from the data query. Probably worth doing if telemetry shows the AuthFlowLoader hangs visible for a few extra ms after the data is ready.
- **`router.preload` on hover/focus** — for the dual-role interstitial buttons ("Continue to Platform" / "Continue to Org Dashboard"), preload the route's chunk + warm queries on `onMouseEnter` so the click→paint feels instantaneous. Same pattern as Linear's nav.
- **Server-driven landing-page resolution** — the `getCustomLandingPage()` call in `UnifiedLogin` happens *after* sign-in and adds a roundtrip before navigation. If we move it into the same RPC that returns dual-role status, we cut one network hop from every login.
