## Positive feedback first

Strong prompt — you bundled an open-ended audit ("any gaps, bugs, enhancements") with two **specific, falsifiable** suggestions (cache-bust, raster fallback) and a scale lens ("large org onboarding"). That's high-leverage prompting because it forces me to evaluate your build against a concrete operating scenario instead of generic best-practice noise.

**How to make this style of prompt even sharper next time:**
- Name a target persona at the top (e.g. *"audit through the lens of a 12-location, 180-stylist multi-location owner installing this on 24 iPads"*) — that lets me rank findings by who actually feels each bug instead of returning a flat list.
- Pre-declare your severity bar (*"only show me P0/P1 — skip nice-to-haves"*). The audit you got back below uses one anyway, but stating it up front compresses the response.

---

## Audit summary — 4 P0/P1 bugs, 3 scale gaps, 2 enhancements

I read `OrgBrandedLogin.tsx`, `org-manifest`, `org-splash`, `useOrgPinValidation`, `TeamLoginUrlCard`, `usePWAInstall`, the `validate_user_pin` RPC, and the `Location` schema. Findings ranked by blast radius.

---

### 🔴 P0 — Bugs that break for real users

**1. React Hooks rule violation in `OrgBrandedLogin.tsx` (lines 267–303)**
`useMemo(manifestSrc)` and `useMemo(splashSrc)` are called **after** two early returns (`if (orgLoading || !authReady) return ...`, `if (orgError || !organization) return <NotFound/>`). This is an unconditional Hooks-order violation — first render returns the loader (0 hooks executed past line 267), then a later render runs all hooks. React will throw `Rendered more hooks than during the previous render` the first time auth resolves on a slow connection. **Fix: move both `useMemo` calls above the early returns.**

**2. Per-location route is broken end-to-end — `locationSlug` is actually a UUID**
- Route is `/org/:orgSlug/loc/:locationSlug/login` (App.tsx line 488)
- `TeamLoginUrlCard` builds `/org/${orgSlug}/loc/${scope}/login` where `scope` is `loc.id` (UUID, line 33)
- `useOrgPinValidation` filters `employee_profiles.location_id.eq.${locationId}` using that UUID — that works
- But `org-manifest` does `.eq('id', loc)` against `locations` — also works (UUIDs)
- The `Location` interface has **no `slug` column**, contradicting the [Location Identity Slugs canon](mem://tech-decisions/location-identity-and-slugs) which mandates text slugs

  **Two possible fixes — needs your call:**
  - **(a) Honest rename**: change route param to `:locationId`, rename everywhere. Ships today, defers the canon.
  - **(b) Honor the canon**: add a `slug` column + lookup-by-slug in both edge functions. Bigger lift, correct long-term.

**3. Cold-start sign-in does not respect device-mode prompt timing**
After a successful email/password sign-in (line 164), the device-mode dialog `setShowDeviceModeDialog(true)` is called — but the very next line is `navigate(redirectTarget, { replace: true })`, which unmounts the page **before the dialog can render**. New owners on a fresh device will never see the chooser. **Fix: either await the choice before navigating, or defer device-mode setup to first PIN re-entry instead of cold start.**

**4. Manifest `start_url` and `scope` ignore the React Router base**
`org-manifest` returns `start_url: /org/${slug}/login` — fine on a single-app deploy, but if the dashboard is ever hosted at a sub-path (or behind a CDN with path rewrites), iOS launches the PWA into a 404. **Fix: derive `start_url` from a `?host=` query param sent by the client, or include it in the meta tags so the browser resolves it relative to the current page.**

---

### 🟠 P1 — Scale gaps for large-org onboarding

**5. `OrgLoginUserGrid` is unbounded — 100+ stylists = unusable wall of faces**
`useOrgTeamForLogin` returns *every* PIN-holder for the org. A 12-location operator has 200+ active employees. The grid uses `grid-cols-3 sm:grid-cols-4` with `max-h-[60vh] overflow-y-auto` — staff scroll a vertical wall hunting for their face. **Mitigations (pick 2 of 3):**
- Add a search-by-name input above the grid (1-line `Input` + filter)
- Sort by *recently signed in on this device* first, then alphabetical (use `getRecentUsers` data already available)
- Soft-cap the grid at 24 with "Show all 187 →" disclosure

**6. `pin_attempt_log` rate-limit is **per-org**, not per-device**
The DB caps at 10 attempts per org per 5 minutes (migration line 156). On a 30-iPad chain a single fat-fingered staffer can lock out the entire organization for 5 minutes. **Fix: include a device fingerprint or IP in the rate-limit window, or scale the threshold by org size (e.g. `10 + locationCount * 5`).** This is also a [Multi-Tenant Hardening](mem://security/multi-tenant-isolation-and-hardening) finding worth filing.

**7. `useOrgTeamForLogin` runs an unbounded `.select()` against `employee_profiles`**
No `.limit()`. At enterprise scale (1k+ historical employees) the `is_active=true AND is_approved=true` filter is the only guard. Add `.limit(500)` defensively and surface "Too many to display — use search" if hit. Per [High-Concurrency Scalability canon](mem://tech-decisions/high-concurrency-scalability).

---

### 🟢 Your two suggestions — both yes, with refinement

**8. Cache-bust `?v={org.updated_at}`**
Right call. Today the manifest and splash are cached `public, max-age=3600` and `max-age=86400, immutable` respectively. When an owner updates their logo, iOS holds the stale icon for **24 hours minimum**, browser-side. Implementation:
- In `OrgBrandedLogin.tsx`, append `&v=${encodeURIComponent(organization.updated_at)}` to both `manifestSrc` and `splashSrc`
- In `TeamLoginUrlCard`, no change needed (the URL the user copies is the dashboard URL, not the asset URL)
- The edge functions don't need to read `v` — the URL change alone busts the CDN cache
- **Bonus**: change `apple-touch-icon` to also include the version: `<link rel="apple-touch-icon" href={`${organization.logo_url}?v=${organization.updated_at}`} />`

**9. Static raster PNG fallback for non-Safari**
Right call, but I'd refine the **trigger**. Don't render every install — most orgs never reinstall. Instead:
- Add a one-time **"Generate splash"** button in `TeamLoginUrlCard` that calls `generateDefaultSplash` (already exists in `src/lib/generate-terminal-splash.ts` — same renderer the terminal splash uses) and uploads the PNG to a new `org-splash-cache` Storage bucket as `${orgId}.png`
- Modify `org-splash` edge function to check the bucket first, fall back to inline SVG if not present
- This gives Chrome/Edge/Firefox PWAs a real raster splash without bundling rasterization in the edge runtime
- Cache-bust the cached PNG on logo update via the same `?v=updated_at` pattern
- **Side benefit**: reuses your existing terminal splash brand language, so a stylist installing on Android sees the same aesthetic as the Stripe S710

---

## Proposed implementation order

If you approve this plan, I'll ship in this order to keep each commit reviewable:

| # | Wave | Files | Risk |
|---|------|-------|------|
| 1 | **P0 hooks fix** (#1) | `OrgBrandedLogin.tsx` | Trivial, but ships today before someone hits it |
| 2 | **P0 device-mode timing** (#3) | `OrgBrandedLogin.tsx` | Defer dialog to first PIN re-entry |
| 3 | **Cache-bust** (#8) | `OrgBrandedLogin.tsx` | One-line append, big perceived win |
| 4 | **Per-location naming** (#2) | App.tsx, TeamLoginUrlCard, useOrgPinValidation, org-manifest | **Needs your decision: rename param to `locationId` (fast) or add slug column (canonical)?** |
| 5 | **Grid scale** (#5) | `OrgLoginUserGrid.tsx` | Add name-search + recents-first sort |
| 6 | **Rate-limit scoping** (#6) | New migration | Add device fingerprint column to `pin_attempt_log`, scale threshold |
| 7 | **Defensive limit** (#7) | `useOrgPinValidation.ts` | `.limit(500)` + count guard |
| 8 | **Raster fallback** (#9) | `TeamLoginUrlCard.tsx`, `org-splash/index.ts`, new Storage bucket | One-time generate button, edge bucket-first lookup |

---

## One open question before I implement

**For finding #2 (per-location route), which path do you want?**
- **(a) Fast: rename `:locationSlug` → `:locationId` everywhere.** Ships today. Defers the slug canon for locations-as-PWAs.
- **(b) Canonical: add `slug text unique` to `locations`, backfill from `name`, update both edge functions to look up by slug.** Right long-term, but adds a migration + backfill + UI for editing slugs.

I recommend **(a) now, file (b) as a follow-up** — the location slug canon was written for *public* URLs (booking pages), and these PWA install URLs are bookmarked once per device, so UUID exposure is low-risk.

---

## Further enhancement suggestions (beyond this plan)

1. **Audit log for branded-login PIN attempts** — write to a new `org_login_audit` table (user_id, success, ip, ua) so owners can see "who signed in on which iPad when" from settings. Pairs with [Multi-Tenant Hardening](mem://security/multi-tenant-isolation-and-hardening).
2. **Auto-expire device-mode after 60 days of inactivity** — if no PIN entry in 60d, force the chooser again. Defends against an iPad being repurposed.
3. **Surface "X staff don't have PINs and won't appear in the grid"** in `TeamLoginUrlCard` so owners chase down the gap before deploying — closes the loop on `useOrgTeamForLogin`'s silent filter.

Approve this plan and tell me **(a) or (b)** for finding #2 — I'll execute waves 1–3 unconditionally and route #4 based on your answer.