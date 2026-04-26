## Diagnosis — what the user is seeing

The post-login sequence is now:

1. ✅ Slate-950 `AuthFlowLoader` (login submit → OrgDashboardRoute gates)
2. ❌ **Flash of dashboard chrome** — sidebar + topbar + an empty content well showing only `<Skeleton />` blocks
3. ❌ Then the real dashboard content paints

This is the "flash of dashboard → loader → dashboard" the user is reporting. The chrome is visible during the skeleton phase, so it reads as a stutter even though no full-screen loader actually appears.

### Root cause

`OrgDashboardRoute.DashboardOutlet` calls `clearAuthFlow()` on its first mount. That fires **before** `DashboardHome` has resolved its own first-paint queries:

```ts
// src/hooks/useDashboardLayout.ts:327
isLoading: prefsLoading || templateLoading || (!overrideUserId && isResolvingTarget)
```

```tsx
// src/pages/dashboard/DashboardHome.tsx:300
{layoutLoading ? (
  <div className="space-y-6">
    <Skeleton className="h-24 w-full rounded-xl" />   // <-- the visible "flash"
    <ChartSkeleton lines={4} className="h-32" />
    <ChartSkeleton lines={6} className="h-48" />
  </div>
) : (
  <DashboardSections ... />
)}
```

`<DashboardLayout>` (sidebar + topbar) wraps that skeleton. So the user sees the slate AuthFlowLoader, then for ~100–400ms sees chrome+skeletons on the white/themed canvas, then the real cards mount in. That's the stutter.

The `authFlowSentinel` we built is doing exactly what it was designed to do — it just retires too early. We need to extend it through DashboardHome's true first paint, then retire it.

---

## Fix — three coordinated changes

### 1. `src/pages/dashboard/DashboardHome.tsx` — render the AuthFlowLoader in place of the chrome+skeleton flash

While `layoutLoading` (and `locationAccessLoading`) are true AND the auth-flow sentinel is still active, render `<AuthFlowLoader />` at the top of the function instead of `<DashboardLayout><Skeleton /></DashboardLayout>`. This collapses stages 2 and 3 above into the same continuous slate-950 canvas the user has been looking at since they hit "Sign In."

```tsx
// Top of DashboardHome render, before the existing setup-wizard branch:
const isFirstPaintLoading = layoutLoading || locationAccessLoading;

if (isFirstPaintLoading && isAuthFlowActive()) {
  return <AuthFlowLoader />;
}
```

Critical: the existing `<Skeleton />` block stays as a fallback for **non-handoff** cases (in-app navigation back to /dashboard from another tab, refresh after the sentinel has expired). Only the post-login handoff swaps to AuthFlowLoader.

### 2. `src/components/OrgDashboardRoute.tsx` — defer `clearAuthFlow()` until the dashboard's first paint actually completes

Move the `clearAuthFlow()` call out of `DashboardOutlet`'s mount effect. Instead, `DashboardHome` becomes responsible for clearing the sentinel **after** its first paint succeeds:

```tsx
// In DashboardHome, after the loading guard above:
useEffect(() => {
  if (!isFirstPaintLoading) clearAuthFlow();
}, [isFirstPaintLoading]);
```

`DashboardOutlet` becomes a thin wrapper that no longer manages the sentinel — it just renders `<Outlet />`. This keeps the post-login handoff alive until the dashboard's content well is genuinely ready to paint, not just until the route mounts.

### 3. `mem://style/loader-unification.md` — codify the "first-paint" handoff rule

Add the canon clause:

> **Post-login handoff terminates on first paint, not on first mount.**
> The `authFlowSentinel` MUST remain active until the destination route's first paint queries (e.g. `useDashboardLayout`, `useUserLocationAccess` on `DashboardHome`) have resolved. The destination route — not its parent route guard — is responsible for calling `clearAuthFlow()`. Until then, the destination must render `<AuthFlowLoader />` instead of its skeleton fallback. This guarantees ZERO chrome flash between the slate-950 login canvas and the dashboard's first real paint.

The 30s TTL on the sentinel remains as the self-healing safety net — if the dashboard's queries take longer than 30s, the sentinel times out and the operator-branded loader takes over (the "honest" long-load state).

---

## Files to edit

- `src/pages/dashboard/DashboardHome.tsx` — sentinel-aware first-paint guard + clearAuthFlow on success
- `src/components/OrgDashboardRoute.tsx` — remove eager clearAuthFlow from DashboardOutlet
- `mem://style/loader-unification.md` — add the first-paint handoff clause

---

## Expected result

Login submit → continuous slate-950 + thin-bar visual → dashboard content paints in. **Zero chrome flash. Zero skeleton flash. Zero canvas color change.** The first thing the user sees on the white/themed canvas is the fully-laid-out dashboard — never the sidebar + skeleton intermediate state.

---

## Prompt feedback

You're prompting **excellently** — naming the exact stutter sequence ("flash of dashboard → loader → dashboard") let me skip three layers of guessing and immediately know to look for an inner-component skeleton state vs another route-gate issue. Most users describe this as "it flickers" and force me to instrument before I can diagnose. You gave me the symptom AND the temporal ordering in one sentence.

**One enhancement to try next time:** when you've done 4+ loops on the same surface, prefix the symptom with what's actually working. Example:

> "The slate-950 → dashboard transition is now smooth, BUT I still see a flash of dashboard chrome → skeletons → real content."

That single "what's working" clause confirms I shouldn't unwind the previous fix and instead extend it. Without it, I have to spend a tool call re-reading the prior loop's code to make sure I don't regress anything. The "what's working / what's broken" framing is the strongest debugging-prompt compression I know of.
