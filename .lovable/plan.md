## Goal

Make the org-branded login page **discoverable, shareable, and polished** by:

1. Surfacing the team login URL inside **Settings → Business → Brand Assets** (the deferred task from the previous wave).
2. Shipping the 3 enhancements you proposed.

---

## Phase 1 — Team Login URL card (Settings → Brand Assets)

**File**: `src/components/dashboard/settings/BusinessSettingsContent.tsx`

Add a new card below the existing **Brand Logos** card on the `brand` tab:

- **Title**: `TEAM LOGIN URL` (font-display, design-token canon)
- **Description**: "Bookmark this on team devices or install it as an app. Your team enters their PIN — no password each time."
- **Body**:
  - Read-only input showing `https://{host}/org/{orgSlug}/login`
  - **Copy** button (uses `navigator.clipboard`, sonner toast on success)
  - **Open** button (opens in new tab)
  - **QR code** (using existing `QRCodeFullScreen` pattern, scoped to a small inline preview) so a manager can scan it onto an iPad
- **Source of truth**: Pull `orgSlug` from `useOrganizationContext().effectiveOrganization.slug` — already in scope via the parent component.

**Lint canon check**: Use `tokens.card.title`, `tokens.button.cardAction`. No `font-bold`, no raw shadcn primitives outside the dashboard tree (this is dashboard, so shadcn is fine).

---

## Phase 2 — Per-Location Login URL (Enhancement #1)

**Why**: Once a single org has 30+ stylists across 3 locations, a single avatar grid becomes a wall of faces. Scoping by location keeps shared-mode usable.

**Route**: `/org/:orgSlug/loc/:locationSlug/login`

**Files to create / edit**:
- `src/pages/OrgBrandedLogin.tsx` — already exists; extend to read optional `locationSlug` from route params
- `src/hooks/useOrgPinValidation.ts` — extend `useOrgTeamForLogin` to optionally accept `locationId` and filter `employee_profiles` via the existing `employee_locations` join table
- `src/App.tsx` — register the new nested route alongside the existing `/org/:orgSlug/login`
- `src/components/dashboard/settings/BusinessSettingsContent.tsx` — in the same Team Login URL card, add a **per-location dropdown** that swaps the URL/QR to the selected location's slug
- `supabase/functions/org-manifest/index.ts` — accept optional `loc` query param so the installed PWA scope is location-specific (`/org/{slug}/loc/{loc}/`)

**Fallback**: If `locationSlug` is invalid or not provided, fall back to org-wide behavior (current).

---

## Phase 3 — "Recent on this device" memory (Enhancement #2)

**Why**: A household sharing one laptop (owner + manager) shouldn't see a 30-tile grid OR be forced into single-user personal mode.

**Implementation**:
- New `localStorage` key per org: `zura.org-login.recent.{orgSlug}` → array of `{ user_id, display_name, photo_url, last_used_at }` (max 3, LRU)
- After a successful PIN login on `OrgBrandedLogin`, push the user to this list
- New device-mode option: when stored array length is 2–3, render a compact "Welcome back" tile picker BEFORE the device-mode chooser fires. User taps a face → straight to PIN pad. "Not you?" link opens the full grid (shared mode) or email form (personal mode reset)
- Honors a "Forget this device" button (clears the array)

**Files**:
- `src/pages/OrgBrandedLogin.tsx` — add the recents-tile branch above the existing personal/shared split
- `src/components/auth/OrgLoginRecentTiles.tsx` (new) — 1–3 large avatar tiles, same hover/scale animation as `OrgLoginUserGrid`
- `src/lib/orgLoginDeviceMemory.ts` (new) — small typed wrapper around `localStorage` (read / push / clear / forget)

---

## Phase 4 — Branded splash for installed PWA (Enhancement #3)

**Why**: Today the manifest serves the org's logo as the app icon, but the splash shown while the PWA boots is a generic white screen. Match the polish of your terminal splash automation.

**Implementation**:
- Reuse the renderer pattern from `src/lib/generate-terminal-splash.ts` (1080×1920, black bg, centered logo, accent corner glows)
- New edge function: `supabase/functions/org-splash/index.ts` that renders a PNG at standard PWA splash sizes (640×1136, 750×1334, 828×1792, 1125×2436, 1170×2532, 1242×2688, 1284×2778, 1290×2796 — covering iPhone SE → 15 Pro Max). Cached aggressively via `Cache-Control: public, max-age=86400, immutable`.
  - Uses `imagescript` or canvas-equivalent in Deno; if unavailable, fall back to a single 1242×2688 PNG and let iOS scale.
- `OrgBrandedLogin` `<Helmet>` adds the apple-touch-startup-image links pointing at the new function with `?slug={orgSlug}` (and `?loc={locSlug}` when applicable)
- Color-theme aware: pull `colorTheme` from the org's `site_settings` so the corner glow matches their dashboard palette (consistent with `useAutoSyncTerminalSplash` doctrine)

---

## Files Summary

**New**:
- `src/components/auth/OrgLoginRecentTiles.tsx`
- `src/lib/orgLoginDeviceMemory.ts`
- `supabase/functions/org-splash/index.ts`

**Edited**:
- `src/components/dashboard/settings/BusinessSettingsContent.tsx` (login URL card + per-location selector)
- `src/pages/OrgBrandedLogin.tsx` (location scoping, recents-tile branch, splash links)
- `src/hooks/useOrgPinValidation.ts` (optional `locationId` filter)
- `src/App.tsx` (new nested route)
- `supabase/functions/org-manifest/index.ts` (optional `loc` param → narrower scope)

---

## Doctrine alignment

- **Public vs Private Route Isolation** ✅ — all login surfaces remain outside `OrganizationProvider`
- **Location Identity & Slugs** ✅ — uses string slugs, not UUIDs, in the URL
- **Multi-Tenant URL Hierarchy** ✅ — extends the existing `/org/:slug` namespace cleanly
- **Terminal Splash Automation** ✅ — splash renderer mirrors the existing pattern + color-theme reactivity

---

## Order of execution & cost

| Phase | Effort | Ship priority |
|---|---|---|
| 1 — Login URL card | Small | **Ship first** (unblocks the deferred task) |
| 3 — Recent on device | Small | Ship second (pure client-side, low risk) |
| 2 — Per-location URL | Medium | Ship third (touches edge function + hook + routing) |
| 4 — PWA splash | Medium | Ship last (new edge function, image rendering in Deno) |

I'll execute all four in one wave unless you'd rather stage them.

---

## Open question before execution

**Phase 4 splash rendering**: Deno doesn't have a native Canvas. Two options:
- **A)** Add `imagescript` (pure-TS PNG encoder, no native deps) — clean, ~50KB cold start cost
- **B)** Pre-render once on the client at first PWA install, upload to Supabase Storage as `org-splash/{orgSlug}.png`, serve from CDN — zero cold-start cost, but requires a one-time client-side render trigger

My recommendation: **B** — it's faster at runtime, uses the renderer you already trust (`generate-terminal-splash.ts`), and avoids re-implementing canvas in Deno. I'll proceed with **B** unless you say otherwise on approval.
