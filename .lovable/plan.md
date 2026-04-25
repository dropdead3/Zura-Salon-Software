## Goal
Eliminate the two-hop `/dashboard` → `/org/:slug/dashboard` redirect from the marketing nav and make the CTA reflect *which* organization the user will land in. Aligns with the canonical multi-tenant URL hierarchy doctrine (`mem://architecture/multi-tenant-url-hierarchy`).

## Current behavior
- `MarketingNav.tsx` renders `<Link to="/dashboard">Go to Dashboard</Link>` whenever `useAuth().user` is truthy.
- `/dashboard` is caught by `LegacyDashboardRedirect`, which waits for `OrganizationContext` to hydrate, then `<Navigate>`s to `/org/:slug/dashboard`.
- Cost: a brief loader flash, an extra navigation entry in history, and a generic label that doesn't reveal *which* org the user is about to enter.

## Proposed behavior

### Phase 1 — Direct org-scoped link (correctness fix)
- Use `useOrgDashboardPath()` inside `MarketingNav` to compute the canonical URL.
- Fall back to `/dashboard` (current behavior) only when the slug hasn't resolved yet — preserves correctness during the brief org-context hydration window.
- Apply to both desktop (line 104) and mobile (line 161) link targets.

### Phase 2 — Org-aware label (clarity fix)
- Pull `effectiveOrganization?.name` from `OrganizationContext`.
- Render label as `Open {OrgName}` when name is known, falling back to `Go to Dashboard` otherwise.
- Truncate gracefully past ~22 chars with `truncate max-w-[180px]` so the pill doesn't deform on long org names ("Salon Capelli & Company of Westside" etc.).
- Add `aria-label="Open {OrgName} dashboard"` for clarity.

### Phase 3 — Multi-org safeguard (deferred, not in this change)
- For users with multiple org memberships, surface a tiny dropdown chevron next to the pill that opens an org switcher. **Deferred** until we have a real signal that multi-org operators are getting wrong-org bounces; tracked here so we don't forget.

## Files
- `src/components/marketing/MarketingNav.tsx` — swap hardcoded `/dashboard` for `dashPath('/')`, swap label for `Open {orgName}` with truncation.

## Non-goals
- No change to session persistence (`localStorage` + `autoRefreshToken`) — that behavior is correct and matches operator-tool norms (Slack, Stripe, Linear).
- No change to `LegacyDashboardRedirect` — it remains as the safety net for any other inbound `/dashboard` link (old bookmarks, emails, external referrers).
- No change to the signed-out branch (`Sign In` / `Get a Demo`) — already correct.

## Further enhancement suggestions
1. **Last-visited-page memory.** Persist the last dashboard URL the user was on into `localStorage` (e.g. `zura:lastDashboardPath`) and resolve the marketing CTA to that, not just `/dashboard`. Lets an operator pick up exactly where they left off when they hop back from the marketing site.
2. **Session-age telemetry.** Log a lightweight event when the marketing CTA is clicked with session age >7 days. Gives us empirical data on how long sessions actually live in the wild — useful before we ever consider tightening refresh-token TTL.
3. **Org switcher in marketing nav.** For users with `is_super_admin` or multi-org membership, render a tiny chevron next to "Open {OrgName}" that opens the same org switcher used in the dashboard sidebar. Deferred until we see real demand, but worth scoping now so the layout already accounts for the affordance.
