# Diagnose: Dashboard refresh → marketing page redirect

## Hypothesis

This is a **Lovable preview-iframe artifact**, not an app bug.

When you hit browser refresh inside the editor preview iframe:

1. The iframe re-mounts with a fresh JS context.
2. Supabase's auth client needs ~1 tick to rehydrate the session from `localStorage`.
3. During that tick, `ProtectedRoute` sees `user === null`, runs `<Navigate to="/login" replace />`, and you land on the marketing/login surface.
4. By the time auth rehydrates, the redirect has already happened.

In a real browser tab (your "open in browser" test), this doesn't happen because:
- The top-level origin owns storage cleanly (no iframe sandboxing nuances)
- Vite's HMR + the dev server keep the auth client warm

This matches the documented Lovable Cloud "preview vs. published auth environment" pattern. The standard guidance is to **not modify auth code** to fix preview-only behavior — it usually introduces regressions in the published environment where things already work.

## Phase 1 — Verify it's preview-only (no code changes)

I'll run these checks in read-only mode:

1. **Inspect `ProtectedRoute` and `AuthContext` gating logic** — confirm we already wait on `authReady` (we do — I read it earlier in the conversation, line: `!authReady || loading`), and that the redirect to `/login` only fires after that gate passes.
2. **Inspect `OrgDashboardRoute`** — confirm the same gating happens at the org-scoped boundary so a refresh on `/org/:slug/dashboard/...` doesn't redirect prematurely.
3. **Check the Supabase client config** in `src/integrations/supabase/client.ts` is using `persistSession: true` + `storage: localStorage` (the defaults — but worth confirming).
4. **Reproduce in the preview** with browser tools: refresh on a dashboard route, capture the redirect chain in the network tab, and confirm the auth session token is present in `localStorage` immediately after the redirect (proving the session was there, but the gate fired too early).
5. **Reproduce in a real browser tab** at the same preview URL opened directly (not iframed) and confirm refresh persists. If it does → confirmed preview-iframe artifact. Stop here.

**Expected outcome:** confirms preview-iframe artifact. No code change needed. Your end users will never see this.

## Phase 2 — *Optional* belt-and-suspenders hardening

Only worth doing if Phase 1 surprises us, OR you want refresh-in-iframe to "just work" for your own dev ergonomics.

Two narrow, safe additions:

### 2a. `lastDashboardPath` sentinel
- On every successful dashboard mount, write `sessionStorage['zura.last-dashboard-path'] = window.location.pathname`.
- In `UnifiedLogin`'s auto-arrival `useEffect`, if a session rehydrates **and** the sentinel is present **and** we're currently on `/login` or `/`, redirect back to the saved path instead of running the role-based redirect logic.
- Sentinel is cleared on explicit logout.
- Effect: even if the iframe redirect-flashes us to `/login`, we land back where we were within ~50ms of session rehydrate.

### 2b. Tighten `ProtectedRoute`'s rehydrate window
- Currently `authReady` flips true once the first session resolution completes. In the preview iframe, that resolution can race with the route guard's first paint.
- Add a brief grace window (e.g., one `requestIdleCallback` tick or `await supabase.auth.getSession()`) inside `ProtectedRoute` before deciding `!user → redirect`. Returns `<AuthFlowLoader />` during that window.
- Risk: adds ~10–20ms latency to every protected route mount, even when there genuinely is no session. Mitigated by the existing `AuthFlowLoader` already being on-screen.

### 2c. Doctrine update
- Add a memory note under `mem://style/loader-unification.md` (or a new `mem://auth/preview-iframe-rehydrate.md`) documenting:
  - The preview-iframe refresh behavior is expected
  - The `lastDashboardPath` sentinel is the canonical recovery primitive
  - Auth code itself stays untouched per the Lovable Cloud guidance

## Files Phase 1 will touch (read-only)

- `src/components/auth/ProtectedRoute.tsx` (already viewed — confirmed `authReady` gate)
- `src/components/OrgDashboardRoute.tsx`
- `src/contexts/AuthContext.tsx`
- `src/integrations/supabase/client.ts`
- `src/pages/UnifiedLogin.tsx` (auto-arrival useEffect)

## Files Phase 2 would touch (only if approved)

- `src/lib/lastDashboardPath.ts` *(new)* — sentinel read/write helpers
- `src/pages/dashboard/DashboardHome.tsx` — write sentinel on first paint
- `src/components/OrgDashboardRoute.tsx` — write sentinel on org dashboard mount
- `src/pages/UnifiedLogin.tsx` — read sentinel in auto-arrival useEffect
- `src/contexts/AuthContext.tsx` — clear sentinel on `signOut`
- `mem://style/loader-unification.md` *(append)* or `mem://auth/preview-iframe-rehydrate.md` *(new)*

## Recommended path

**Approve Phase 1 only.** I confirm it's preview-only with no code change, and we close the loop. If the diagnostic surprises us, I come back with a tighter Phase 2 scoped to the actual cause.

---

### Prompt feedback

Strong prompt — you correctly hypothesized "maybe it's a viewer issue" before asking for a fix. That framing saves a wasted code-change cycle. Two ways to make these even sharper next time:

1. **State the comparison condition explicitly.** You did this here ("works correctly when I open and view in browser") — keep doing it. That single sentence rules out half the hypothesis space (it's not an auth bug, not a routing bug, not an RLS issue).
2. **Name the surface you landed on.** "Marketing front-end page" is good; "marketing front-end at `/` after refreshing on `/org/halo/dashboard/schedule`" would let me jump straight to the exact route guard chain without re-deriving it.

### Future enhancement suggestion

Whether or not we ship Phase 2, consider adding a tiny dev-only banner that renders inside the preview iframe ONLY (detect via `window.self !== window.top`) saying "Preview iframe: refresh may bounce to login — this does not affect published builds." That would save you (and any teammate) from re-investigating this every time it surfaces. Low effort, high signal.