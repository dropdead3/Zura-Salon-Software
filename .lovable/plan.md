

## Prompt feedback
"need to debug" + a screenshot is fine for an obvious crash, but it forces me to derive the failure mode from the stack trace. Sharper next time: paste or quote the error line ("useOrganizationContext must be used within an OrganizationProvider — happens on /login") and name where it surfaces. That cuts one round-trip.

## What's broken

The runtime error is a direct regression from the Theme Governance refactor:

- `ThemeInitializer` is mounted at the **App root** (`src/App.tsx` line 472), wrapping every route — public marketing pages, `/login`, `/signup`, org public booking, etc.
- The refactor added `useOrganizationContext()` inside `ThemeInitializer`.
- `OrganizationProvider` only wraps the **private dashboard shell** (`PrivateAppShell` line 272).
- On every public route — including `/login` where the screenshot was taken — the hook throws because it's outside the provider, and the ErrorBoundary surfaces "Unexpected Interruption."

The `zone !== 'org-dashboard'` guard inside `ThemeInitializer` was supposed to make custom-theme application a no-op outside the dashboard, but the hook call itself happens before the guard, so the throw fires unconditionally.

## The fix

### 1) Add a safe accessor for OrganizationContext

Export a sibling hook from `src/contexts/OrganizationContext.tsx`:

```ts
export function useOptionalOrganizationContext() {
  return useContext(OrganizationContext); // undefined if no provider
}
```

This is the canonical pattern for components that may render both inside and outside a provider tree. It does not change `useOrganizationContext` — strict callers keep their throw.

### 2) Switch `ThemeInitializer` to the safe accessor

Replace the hook call:
- From: `const { effectiveOrganization } = useOrganizationContext();`
- To: `const orgCtx = useOptionalOrganizationContext();`
- Then: `const orgId = orgCtx?.effectiveOrganization?.id;`

Behavior on public routes: `orgId` is `undefined`, the existing `zone !== 'org-dashboard' || !orgId` guard fires, `clearAppliedVars()` runs, and the component renders nothing. No crash.

Behavior on dashboard routes: identical to today (provider exists, full org-scoped theme load runs).

### 3) Verify `useOrgThemeReset` doesn't have the same trap

It's only mounted in `DashboardLayout`, which lives inside `PrivateAppShell` → `OrganizationProvider`. Safe as-is. No change needed.

## Files involved
- `src/contexts/OrganizationContext.tsx` — add `useOptionalOrganizationContext`
- `src/components/ThemeInitializer.tsx` — switch to the optional accessor + null-safe orgId

## What stays the same
- All Theme Governance behavior on the dashboard (org-scoped persistence, owner gating, custom theme application, sign-out cleanup)
- All public-route theme behavior (light/dark via `next-themes` `data-public-theme`, untouched)
- `useOrganizationContext` strict throw — still the right default for dashboard-only consumers

## QA checklist
- `/login` loads cleanly with no error boundary
- `/` (marketing landing), `/pricing`, `/org/:slug` public booking — all load with no error
- Sign in → dashboard paints with the correct org's brand colors
- Sign out → returns to `/login` with no flash of previous brand
- Org switch in same browser session — still clean (handled by `useOrgThemeReset`)
- No new console warnings about provider misuse

## Enhancement suggestion
Add a one-line lint rule (or a Vitest file-pattern check) banning `useOrganizationContext` inside any component imported by `App.tsx` *above* `<PrivateAppShell />`. The boundary between "App-root scope" and "dashboard-shell scope" is a real seam and currently invisible at the call site. A grep-style test that fails CI when a root-level component pulls a dashboard-scoped hook would have caught this regression before it shipped — same shape as the Loader2 lint canon.

