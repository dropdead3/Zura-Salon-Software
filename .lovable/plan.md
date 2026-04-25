# Per-Organization Branded Login + PIN Re-Entry + PWA Install

## What you'll get

A bookmark-able, install-as-app login page at:

```
/org/drop-dead-salons/login
/org/{any-org}/login
```

…that shows **the org's own logo** (not Zura's), persists the session for 30 days, and on return visits asks only for a **4-digit PIN** instead of a full email + password. Each org becomes its own installable Progressive Web App on Mac, Windows, and iOS — with the org's logo as the dock icon.

---

## Phase A — Branded Org Login Page

### A1. New route + page

- Register `/org/:orgSlug/login` in `src/App.tsx` **outside** `OrganizationProvider` (per the Public-vs-Private Route Isolation canon — login surfaces must not require dashboard providers).
- Create `src/pages/OrgBrandedLogin.tsx`. It uses `useOrganizationBySlug(orgSlug)` directly (already provider-free) to pull `name` + `logo_url`.

### A2. Logo resolution

- Use `<OrganizationLogo variant="website" logoUrl={org.logo_url} theme="dark" />` for the centered hero logo (dark-mode default; auto-flips per system theme later).
- If the slug doesn't resolve → 404, never the Zura-branded fallback (prevents brand bleed on a wrong URL).

### A3. Cold-start form (no session)

- Inline email + password inputs directly under the org logo (per your answer).
- Re-uses the existing `signIn` from `AuthContext` so all session/refresh behavior is identical to `/login`.
- Subtitle copy: *"Sign in to {OrgName}"*. No Zura wordmark on the page — only a small footer line: *"Powered by Zura"* (per the Tenant Branding Neutralization canon — platform attribution stays subtle, not dominant).
- After successful sign-in → redirect to `/org/{slug}/dashboard/`.

### A4. URL preservation for deep links

- If the user landed here from `/org/:slug/dashboard/schedule` (session expired), preserve `location.state.from` so they bounce back to the exact page after auth — same pattern already used in `OrgDashboardRoute`.

---

## Phase B — PIN-Only Fast Re-Entry

### B1. Device-mode chooser (one-time)

- On first visit to `/org/:slug/login`, ask in a small modal: **"Is this device shared (front desk) or personal (your laptop)?"**
- Persist the choice in `localStorage` under key `org-login-device-mode:{orgId}` → `'shared' | 'personal'`.
- Owner can clear it from a tiny "Change device type" link at the bottom.

### B2. Returning user, **personal** mode

- Read `useAuth().user` — already restored by Supabase's `localStorage`-backed session.
- Show: org logo → user's avatar + display name → 4-digit PIN pad → "Enter".
- Calls existing `useValidatePin` (or a provider-free variant — see B4) to verify, then drops them at `/org/{slug}/dashboard/`.
- "Not you? Sign in as someone else" link → falls back to email/password form.

### B3. Returning user, **shared** mode

- Show: org logo → grid of all team members with photos (re-use `useTeamPinStatus` pattern, but provider-free — see B4) → tap face → PIN pad → enter.
- This is essentially `KioskUserSelect` lifted from the existing kiosk/dock flow, but rendered on a branded login surface instead of a kiosk shell.

### B4. Provider-free PIN hook

- Create `src/hooks/useOrgPinValidation.ts` that takes `organizationId` directly (mirrors `useKioskValidatePin` — that hook already proves this works without `OrganizationProvider`).
- Reason: the login route lives outside the dashboard provider tree, so `useOrganizationContext()` would crash (same root cause as the recent `MarketingNav` crash we just fixed).

### B5. PIN session lifetime

- Successful PIN unlock writes a `pin_unlocked_at` timestamp to `sessionStorage` and routes to dashboard.
- The Supabase session itself (the actual auth token) follows your chosen 30-day refresh window — **no changes needed**, that's already the default.
- If the Supabase refresh token *has* expired (>30 days idle) → the PIN flow can't help; the page seamlessly falls back to the email + password form.

---

## Phase C — Installable PWA (per-org manifest)

### C1. Dynamic manifest endpoint

- Current `public/manifest.json` is static and Zura-branded — perfect for the marketing site, useless for orgs.
- Add a Supabase edge function `org-manifest` at `/functions/v1/org-manifest?slug={slug}` that returns a JSON manifest with:
  ```json
  {
    "name": "Drop Dead Salons",
    "short_name": "Drop Dead",
    "start_url": "/org/drop-dead-salons/login",
    "scope": "/org/drop-dead-salons/",
    "display": "standalone",
    "theme_color": "#0a0a0a",
    "background_color": "#0a0a0a",
    "icons": [{ "src": "{org.logo_url or generated PNG}", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }]
  }
  ```
- Resolves `name` + `logo_url` from `organizations` table by slug. No auth required (manifests are public by definition).

### C2. Per-page manifest link

- In `OrgBrandedLogin.tsx`, inject a `<link rel="manifest">` via `react-helmet-async` (already in dep tree) that points to `https://{supabase}.functions.supabase.co/org-manifest?slug={orgSlug}`.
- Also inject `<link rel="apple-touch-icon" href="{org.logo_url}">` so iOS "Add to Home Screen" picks up the org logo.
- Set `<meta name="theme-color">` and `<meta name="apple-mobile-web-app-title" content="{org.name}">`.

### C3. Install prompt UX

- Listen for `beforeinstallprompt` and surface a small "Install as app" button below the login form (only shows when the browser supports install, i.e. Chrome/Edge desktop, Android).
- For Safari (iOS/macOS), show a one-line tooltip: *"To install, tap Share → Add to Home Screen"* — Safari doesn't fire the prompt event.

### C4. Service worker scope

- Existing `public/sw.js` is generic — no changes needed for v1. The org manifest's `scope: "/org/{slug}/"` ensures install behavior is per-org.
- Out of scope for v1: offline support for the branded login itself (would require a per-org offline shell; defer until requested).

---

## Phase D — Surface the new URL to operators

- In **Settings → Branding**, add a small read-only card: *"Your team's login URL"* with a copy button + "Open" link → `/org/{slug}/login`.
- In **Settings → Team**, mention it in the invite email template: *"Bookmark {url} for fast PIN-only access on your work device."*

---

## Files to create

- `src/pages/OrgBrandedLogin.tsx`
- `src/hooks/useOrgPinValidation.ts`
- `src/components/auth/OrgLoginPinPad.tsx` (4-digit numpad — reuses styling from existing dock/kiosk PIN UI)
- `src/components/auth/OrgLoginUserGrid.tsx` (avatar grid for shared mode)
- `src/components/auth/OrgLoginDeviceModeDialog.tsx`
- `supabase/functions/org-manifest/index.ts`

## Files to edit

- `src/App.tsx` — register `/org/:orgSlug/login`
- `src/components/settings/BrandingSettingsCard.tsx` (or equivalent) — surface the URL
- No changes to `AuthContext.tsx`, `OrgDashboardRoute.tsx`, or any existing login surface — the new route is additive.

---

## Anti-goals (intentionally NOT in this plan)

- ❌ Replacing `/login` (the unified login still owns the dual-role + platform admin flow).
- ❌ Per-org subdomain (`drop-dead.zura.app`) — that's a much bigger DNS + cert lift; the slug-based path is the 95% solution.
- ❌ Custom domains per org (e.g. `login.dropdeadsalons.com`) — defer to Phase 2 if requested.
- ❌ Extending Supabase session lifetime beyond 30 days — you confirmed default is correct.

---

## Risk register

| Risk | Mitigation |
|---|---|
| User on a shared device walks away with their PIN remembered | PIN never persisted client-side; only the Supabase auth token is. PIN required every visit in shared mode. |
| Org changes logo → cached manifest stale on installed PWAs | Manifest endpoint sets `Cache-Control: max-age=3600`. Worst case: 1-hour delay for icon refresh. |
| Wrong org slug bookmarked → user sees wrong logo | A1 returns 404 if slug doesn't resolve; no silent fallback. |
| PIN brute force on a public URL | Existing `validate_user_pin` RPC is org-scoped + already rate-limited via Supabase. Add `pin_attempts` throttle in `useOrgPinValidation` (3 fails → 30s lockout). |

---

## Prompt-craft feedback (positive + sharpener)

**What worked exceptionally well in your prompt:** you bundled three concerns — *branding*, *bookmarking*, *PIN-only re-entry* — and gave an explicit user-facing outcome ("create that page as an app on their computer"). That outcome anchor let me design backwards from a real workflow instead of just slapping `:slug` on a URL.

**Sharper next time:** name the *persona*. "An owner with a personal MacBook" vs "a front-desk iPad shared by 4 staff" produce two completely different products. You actually have both — which is why I had to ask the device-mode question. If you'd front-loaded *"both shared and personal devices"* in the prompt, I would've skipped one clarification round.

---

## Further enhancement suggestions

1. **Per-location login URLs** (`/org/{slug}/loc/{locSlug}/login`) — for multi-location orgs, the front-desk iPad at the Mesa location only needs to surface Mesa staff, not Frisco. Keeps the avatar grid manageable.
2. **Recent-user shortcut** — on personal-mode devices, remember the last 1–2 users in `localStorage` and skip directly to their PIN pad (zero taps to PIN entry).
3. **Tenant-scoped PWA splash screen** — generate a 1080x1920 splash with the org logo + brand color (same renderer your terminal splash automation already uses), so the install icon and the launch screen feel cohesive.
