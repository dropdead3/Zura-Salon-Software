## Problem — what the user actually sees today

A cold visit to `/login` (or `/org/:slug/login`) and a sign-in currently flips the entire screen **5+ times**, each cut hard-edged with a different background and a different loader:

| Phase | Component | Background | Loader |
|---|---|---|---|
| 1. JS bundle parse | Suspense fallback in `App.tsx:480` | `bg-background` (theme) | `BootLuxeLoader` (Z-grid + bar) |
| 2. Form mounts | `UnifiedLogin` body (`pages/UnifiedLogin.tsx:550`) | `bg-slate-950` + violet/purple gradient blobs + grid | — |
| 3. Submit click | In-form button (`UnifiedLogin.tsx:784`) | (form still up) | `Loader2` inside button |
| 4. Post-auth routing | `checkingAccess` block (`UnifiedLogin.tsx:400-411`) | `bg-slate-950` (no gradients) | `Loader2` violet spinner + text "Checking access…" |
| 5. Navigate to `/dashboard` | `OrgDashboardRoute` (`OrgDashboardRoute.tsx:56,122`) | `bg-background` (theme) | `BootLuxeLoader fullScreen` |
| 6. Permission resolve | `ProtectedRoute` (`ProtectedRoute.tsx`) | `bg-background` | `BootLuxeLoader fullScreen` |
| 7. Dashboard paints | — | theme | — |

`OrgBrandedLogin` adds a 7th variant: `Loader2 w-7 h-7 text-white/60` on `bg-slate-950` (`OrgBrandedLogin.tsx:325-330`).

**Three problems compound:**
1. **Two competing background palettes** — `bg-slate-950` (login surfaces) vs. `bg-background` (boot/protected loaders). Even when both look "dark," the tonal jump is visible.
2. **Three loader visuals** — `BootLuxeLoader` (Z-grid+bar), `Loader2` violet spinner with "Checking access…" copy, `Loader2` white/60 spinner. They replace each other with hard cuts.
3. **No crossfade** — every phase is an unmount/remount; the user perceives a "stutter" instead of a state change.

## Goal

The boot → form → post-submit → dashboard transition should feel like **one continuous surface**: same background, same loader treatment, content faded in/out within a stable shell. No procedural copy ("Checking access…"), no spinner swap.

## Plan

### 1. Unify the background — one canvas across all login phases

Refactor `UnifiedLogin` and `OrgBrandedLogin` so the **outer background shell is always rendered**, regardless of phase. The shell owns:
- `min-h-screen bg-slate-950` + the gradient blobs + the grid pattern (already used by the form)
- A centered viewport region where phase content swaps

Then *every* internal state — Suspense fallback equivalent, the form, the post-submit "checking" view, and the dual-role interstitial — renders **inside** that same shell. No more naked `bg-slate-950` re-mounts with a centered spinner.

**Files:**
- `src/pages/UnifiedLogin.tsx` — extract the `<div className="min-h-screen bg-slate-950 …">` + background blobs + grid into a `<LoginShell>` wrapper component (defined locally or in `src/components/auth/LoginShell.tsx`). Wrap *all* return branches (current 400-411 checking-access block, 414-521 dual-role interstitial, 524-545 expired invitation, 549-857 main form) so the canvas never unmounts.
- `src/pages/OrgBrandedLogin.tsx` — same: wrap the `orgLoading || !authReady` gate (325-330) in the same shell so we don't flash a bare `bg-slate-950 + Loader2` before the branded surface paints.

### 2. Replace `BootLuxeLoader` on the auth path with the same shell

The Suspense fallback at `App.tsx:480` and the `BootLuxeLoader fullScreen` calls in `OrgDashboardRoute.tsx:56,122` and `ProtectedRoute.tsx` currently render on `bg-background` (theme), which clashes with the slate-950 login canvas.

Two options — recommend **Option A**:

**Option A (preferred):** Create a single canonical loader **surface** (`<AuthFlowLoader />`) that matches the login shell — `bg-slate-950`, same gradient blobs, centered logo + minimal progress indicator (the existing bar from `BootLuxeLoader`, no Z-grid). Use it for:
- The Suspense fallback wrapping `/login` and `/org/:slug/login` routes only (split the Suspense boundaries — keep `BootLuxeLoader` for non-auth routes).
- `OrgDashboardRoute.tsx:56,122` when the *redirect target is the dashboard arriving from `/login`* (detect via `document.referrer` or a session marker set right before `navigate(redirectPath)`).
- `ProtectedRoute.tsx` when transitioning *from* a login route.

This means: from the moment the user lands on `/login` until the dashboard actually paints, the visible canvas is **one continuous slate-950 surface** with only the centered content fading.

**Option B (lighter):** Keep `BootLuxeLoader` everywhere but change its background from `bg-background` → `bg-slate-950` for the auth route group only. Less robust (theme drift) but smaller diff. We'll go with **A**.

**Files:**
- New: `src/components/auth/AuthFlowLoader.tsx` — shell + centered logo + thin bar from `BootLuxeLoader`'s bar animation.
- New: `src/components/auth/LoginShell.tsx` — exported shell so both the loader and the form share identical markup.
- `src/App.tsx` — split the outer `Suspense fallback={<RouteFallback />}` so `/login` and `/org/:orgSlug/login` use `<AuthFlowLoader />`. (Since `UnifiedLogin` is eagerly imported the fallback rarely fires for it — but it's the right contract.)
- `src/components/OrgDashboardRoute.tsx` — accept an optional `loaderVariant?: 'boot' | 'auth'` prop, default `boot`, render `<AuthFlowLoader />` when `auth`. Set this prop on the dashboard route via a small wrapper that reads a session sentinel.
- `src/components/auth/ProtectedRoute.tsx` — same loaderVariant pattern.
- `src/pages/UnifiedLogin.tsx` and `src/pages/OrgBrandedLogin.tsx` — set `sessionStorage.setItem('auth-flow-active', '1')` right before `navigate(redirectPath, …)`. The dashboard's first successful render clears it.

### 3. Crossfade phase content inside the shell

Inside the shell, wrap the phase content (form / checking-access / dual-role / loader) in a `<motion.div>` (framer-motion is already used elsewhere — `OrgLoginPinPad.tsx` imports it) keyed by the phase, with:
```
initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
transition={{ duration: 0.18, ease: 'easeOut' }}
```
Wrap with `<AnimatePresence mode="wait">`. Result: the form fades out → loader fades in → loader fades out → dashboard begins fading in, all over the same canvas.

**Files:** `src/pages/UnifiedLogin.tsx`, `src/pages/OrgBrandedLogin.tsx`.

### 4. Remove the redundant "Checking access…" interstitial

After a successful sign-in, the form already shows the in-button `Loader2`. Replacing the entire screen with another spinner+text adds a phase the user doesn't need.

**Change:** Drop the full-screen `checkingAccess`/`loadingPlatformInvitation` block (`UnifiedLogin.tsx:400-411`). Instead, keep the form mounted with the submit button in its loading state and an overlay shimmer on the form card while routing decisions resolve. The moment the navigate fires, the shell stays up and only the phase content fades to the unified loader.

If we still want a copy line for slow networks (>1.2s), use a single subtle line *inside the form card* — not a full-screen takeover. Suggested copy: a soft "Signing you in" with the bar (no word "checking").

### 5. Remove "Welcome back" / procedural copy on the loader

Per the existing direction, the auth-flow loader carries **no text** — just the brand mark and the bar. Silence is the calm signal.

### 6. Memory updates

Append to `mem://style/loader-unification.md`:
- New canon: **Auth-flow surfaces share one canvas.** From `/login` mount through dashboard first paint, the user must perceive a single continuous background. Boot loader (`BootLuxeLoader`) is for *non-auth* routes only; the auth path uses `<AuthFlowLoader />` on the slate-950 canvas.
- Ban: full-screen spinner-with-procedural-text screens (e.g. "Checking access…") on the auth path. Routing decisions resolve behind a faded-in form or the unified loader, never a third treatment.

## Expected user-visible result

1. Land on `/login` → slate-950 canvas appears once.
2. Form fades in over it.
3. Click Sign In → button spins; form fades out; bar appears in same canvas (~150ms crossfade).
4. Dashboard route resolves → bar stays on the same canvas (no swap to `bg-background`).
5. Dashboard content fades in over the canvas → canvas yields to the dashboard chrome.

Total perceived screen changes: **1** (canvas → dashboard), with content crossfades inside the canvas.

## Files to edit

- `src/pages/UnifiedLogin.tsx` — extract shell, drop checkingAccess full-screen block, wrap phases in `AnimatePresence`, set auth-flow sentinel before navigate.
- `src/pages/OrgBrandedLogin.tsx` — wrap orgLoading gate in shell, same `AnimatePresence` treatment.
- `src/App.tsx` — split Suspense fallback for `/login` + `/org/:slug/login` routes.
- `src/components/OrgDashboardRoute.tsx` — render `<AuthFlowLoader />` when sentinel is present.
- `src/components/auth/ProtectedRoute.tsx` — same sentinel-aware variant.
- `src/components/auth/LoginShell.tsx` — **new**, the slate-950 canvas + gradient blobs + grid.
- `src/components/auth/AuthFlowLoader.tsx` — **new**, shell + brand mark + bar.
- `mem://style/loader-unification.md` — extend canon with the auth-flow surface rule.

## Prompt feedback (for you)

Your prompt was strong because it framed the issue as a **felt experience** ("seamless," "too many screen changes") rather than a single CSS bug — that gave me room to audit the entire chain instead of patching one component. To make it even sharper next time:

- **Name the moments you want to feel different.** "From the moment I click Sign In until the dashboard paints, I should see one continuous background" pins the contract precisely.
- **Specify whether the boot loader is part of the problem.** You said "the entire login load sequence," which I interpreted as boot → form → post-submit → dashboard. If you only meant *post-submit*, the fix is a third the size.
- **Call out which palette wins.** I assumed slate-950 (the login canvas) is the visual anchor and the boot loader's `bg-background` should bend to it. If you'd rather the auth flow conform to the dashboard theme, that's a different (smaller) refactor.

If any of those assumptions are off, tell me which and I'll re-scope before building.