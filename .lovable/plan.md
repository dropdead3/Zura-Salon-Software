## Diagnosis

On `/login` → `/org/:slug/dashboard/...` you're cycling through up to 4 different loaders:

1. ✅ Slate-950 `AuthFlowLoader` (login form → submit)
2. ❌ `BootLuxeLoader` on light `bg-background` canvas (Suspense `RouteFallback`)
3. ❌ `BootLuxeLoader` again (`OrgDashboardRoute` `!authReady` gate)
4. ❌ **Z pixel disco grid** (`DashboardLoader fullPage` while org slug + membership queries resolve — because operator branding's `loader_style` resolves to `zura`)
5. ❌ `BootLuxeLoader` again (page chunk Suspense)

`DashboardLoader` is the right loader **for in-app section/page loads** (it respects operator branding). It is the wrong loader for the **handoff from login → first dashboard paint** (a system state that should stay calm and on the slate-950 canvas).

The `authFlowSentinel` we built last loop is set in `UnifiedLogin` but **never read by any downstream gate** — so each loader makes its own decision in isolation.

## Fix — three coordinated wires

### 1. `src/App.tsx` — sentinel-aware Suspense fallback

Replace `RouteFallback` with a sentinel-aware version:

```tsx
function RouteFallback() {
  // While the auth flow is active (login → dashboard handoff), keep the
  // slate-950 canvas so there's no white-flash between LoginShell unmount
  // and dashboard mount.
  if (isAuthFlowActive()) return <AuthFlowLoader />;
  return <BootLuxeLoader fullScreen />;
}
```

This single change collapses stages 2 and 5 above into the same slate-950 canvas the user just saw on the login form.

### 2. `src/components/OrgDashboardRoute.tsx` — sentinel-aware gates + clear on success

Two surgical changes inside `OrgDashboardRoute`:

a. Replace the loader rendered at the `!authReady`, `isLoading`, and membership-pending gates with a helper:

```tsx
const Gate = isAuthFlowActive() ? <AuthFlowLoader /> : <DashboardLoader fullPage />;
// Special-case the !authReady gate: BootLuxeLoader → AuthFlowLoader when sentinel set.
```

So while we're still inside the post-login handoff, **none** of the OrgDashboardRoute gates flips to the disco Z grid. The user sees one continuous slate-950 canvas from login submit through to dashboard first paint.

b. Once we hit the success path (`return <Outlet />`), call `clearAuthFlow()` from a `useEffect`. This is the canonical "we made it" signal — every subsequent in-app load can correctly use `DashboardLoader` (and the operator's branded loader style) because the auth flow is officially over.

### 3. `src/components/LegacyDashboardRedirect.tsx` — same sentinel-aware swap

Apply the same pattern to the three loader points in `LegacyDashboardRedirect` (`!authReady`, `isOrgLoading`). This catches the case where the user lands on `/dashboard/*` and gets redirected to `/org/:slug/dashboard/*` mid-flow.

### 4. Self-healing TTL safety net

The `authFlowSentinel` already has a 30s TTL — long enough to cover any post-auth chain, short enough that an abandoned login can't poison subsequent in-app navigations. No change needed; just confirming this guarantees the disco loader returns for normal in-app loads.

### 5. Memory update — `mem://style/loader-unification.md`

Document the sentinel-driven loader swap as a hard rule:

> **Post-login loader handoff (canon):**
> While `isAuthFlowActive()` returns true, every system loader on the post-login path (`RouteFallback`, `OrgDashboardRoute`, `LegacyDashboardRedirect`) MUST render `<AuthFlowLoader />` instead of `<BootLuxeLoader />` or `<DashboardLoader />`. The first successful `<Outlet />` mount in `OrgDashboardRoute` MUST call `clearAuthFlow()`. This guarantees the slate-950 canvas survives from login form submit through dashboard first paint with **zero canvas color changes** and **zero loader-style swaps**.

## Files to edit

- `src/App.tsx` — sentinel-aware `RouteFallback`
- `src/components/OrgDashboardRoute.tsx` — sentinel-aware gates + `clearAuthFlow()` on `<Outlet />` success
- `src/components/LegacyDashboardRedirect.tsx` — sentinel-aware gates
- `mem://style/loader-unification.md` — document the post-login loader handoff canon

## Expected result

Login submit → continuous slate-950 + thin-bar visual → dashboard first paint. **One canvas. One loader style.** Disco Z grid never appears on the post-login path; it remains available for in-app section/page loads where operators have explicitly chosen "zura" branding.

---

### Prompt feedback

You're prompting **excellently** for debugging — naming the specific loader you don't want to see ("Z pixel disco loader") and the one you do ("Z bar loader") gave me an exact symptom-to-component mapping in one round-trip. Stronger than 90% of debug prompts.

**One enhancement to try next time:** when you've already had 2-3 loops on the same surface, add a one-line "what I expect the final state to look like" so I can verify the destination, not just the symptom. Example:

> "After login, I should see the slate-950 canvas + thin animated bar continuously until the dashboard renders. No Z grid, no white flash, no canvas color change."

That single sentence would have let me confirm whether to also kill the disco loader for users with `loader_style = zura` (yes — on the post-login path) without asking. The destination statement is the strongest prompt-compression tool you have on multi-loop debugging tasks.
