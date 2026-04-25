## Three enhancements to the branded login system

Each is small and isolated. I'll sequence them lockout → preview → auto-regen so the riskiest piece (RPC signature change) lands first and the rest stack on top.

---

### Wave 1 — Lockout UX with live countdown

**Problem.** When `validate_user_pin` raises the per-device exception, the client today shows a generic toast (`title: 'PIN check failed'`) — staff don't know whether to wait 10 seconds or 10 minutes. The 30-second client-side lockout already has a countdown path (`pinLockoutUntil`), but server-side exceptions bypass it.

**Approach — surface a structured retry window from the RPC, not a parsed string.**

1. **Migration.** Update `validate_user_pin` (and `validate_dock_pin` for parity) to return a row even on lockout, with a new `lockout_until timestamptz` column and the existing identity columns nulled. Drop the `RAISE EXCEPTION` for rate limits — keep it only for unexpected failures. This avoids brittle error-message parsing on the client.
   - Returned row on lockout: `(user_id=null, …, lockout_until = max(device_window_end, org_window_end))`
   - Returned row on success: `(…, lockout_until = null)`
   - Returned 0 rows: PIN didn't match (current behavior preserved)

2. **Hook.** `useOrgValidatePin` returns the new shape; on `lockout_until !== null`, the mutation resolves with `{ lockedUntil: Date }` instead of throwing.

3. **UI.** In `OrgBrandedLogin`:
   - When `lockedUntil` comes back, set `setPinLockoutUntil(lockedUntil.getTime())` — this reuses the existing countdown plumbing.
   - Add a `<LockoutCountdown until={pinLockoutUntil} />` component rendered above the pinpad: "Too many attempts on this device. Try again in **4:38**." Updates every 1s via `setInterval` cleared on unmount.
   - Disable the pinpad while locked (the existing `validatePin.isPending` disable wraps the mutation; we'll OR it with `pinLockoutUntil > now`).
   - Replace the generic "Locked out" toast with a quiet `sonnerToast.info` so the inline countdown is the dominant signal (alert-fatigue doctrine — silence > redundant noise).

**Files touched:** new migration, `src/hooks/useOrgPinValidation.ts`, `src/pages/OrgBrandedLogin.tsx`, new `src/components/auth/LockoutCountdown.tsx`.

---

### Wave 2 — Inline splash preview in TeamLoginUrlCard

**Problem.** Owners click "Generate splash," get a toast, and have no idea if the logo is centered correctly, the wordmark is legible, or the brand color resolved as expected. They'd need to reinstall the PWA on a fresh device to verify.

**Approach.**

1. **Capture the dataUrl in mutation state.** Update `useGenerateOrgSplash` to return `{ path, dataUrl, size }` from `mutationFn` so the caller can render the JPEG immediately without a round-trip to storage. (We already have it in memory before upload.)

2. **Cached fallback.** On mount, if no fresh dataUrl is in state, attempt to load the previously cached splash from the public bucket URL (`{SUPABASE_URL}/storage/v1/object/public/org-splash-cache/{orgId}.jpg?v={updated_at}`). If it 200s, show it; if it 404s, hide the preview pane.

3. **UI in `TeamLoginUrlCard`.** Below the existing "Generate splash" row, add a collapsible preview pane:
   - 1080×1920 source rendered at ~108×192 on screen (10% scale) inside a `bg-black rounded-lg border` frame.
   - Caption: *"Preview — what staff will see when launching your installed app."*
   - Show a `Skeleton` while the cached image is loading; show empty state ("Generate a splash to see a preview") when neither dataUrl nor cached file exists.
   - "Open full size" link opens the dataUrl/storage URL in a new tab.

**Files touched:** `src/hooks/useGenerateOrgSplash.ts`, `src/components/dashboard/settings/TeamLoginUrlCard.tsx`.

---

### Wave 3 — Auto-regenerate on logo change

**Problem.** If an owner uploads a new logo, the cached `{orgId}.jpg` is stale until they manually click "Regenerate splash." The cache-bust query param (`?v={updated_at}`) only helps the *non-rasterized* SVG path — it doesn't refresh the bucket file itself.

**Approach — fingerprint the cached splash and auto-regenerate when the inputs change.**

1. **Track the input fingerprint.** In `org-splash-cache` storage metadata, store a `customMetadata: { logoFingerprint: string, themeFingerprint: string }` on upload. Fingerprint = `sha-256(logo_url + colorTheme + org.name).slice(0,16)`.

2. **On `TeamLoginUrlCard` mount + on `organization` query data change:**
   - Compute current fingerprint from `effectiveOrganization.logo_url + colorTheme + name`.
   - Read the cached object's metadata via `supabase.storage.from('org-splash-cache').list('', { search: `${orgId}.jpg` })`.
   - If `logoFingerprint` differs **and** there's a cached file, surface a soft inline notice: *"Your logo changed since the last splash was generated. [Regenerate now]"* — one-tap regen button.
   - If the user has auto-regen enabled (see open question below), trigger `generateSplash.mutate()` automatically and toast quietly.

3. **Why not a DB trigger or webhook?** The renderer is browser-only (`document.createElement('canvas')`, `Image()` with `crossOrigin`). Pushing this to the edge would require porting `generateDefaultSplash` to a headless renderer (skia-canvas / resvg) — out of scope for a refresh affordance. The "next time an owner visits Brand settings, we'll prompt or auto-regen" pattern is the right level of effort.

**Files touched:** `src/hooks/useGenerateOrgSplash.ts` (fingerprint + metadata write), `src/components/dashboard/settings/TeamLoginUrlCard.tsx` (drift detector + UI).

---

### Open question

**Should Wave 3 auto-trigger regeneration, or just nudge?** Auto means staff installs are always fresh, but it costs a silent canvas render + ~200KB upload every time an owner visits Brand settings after a logo change. Nudge respects the owner's intent ("I'll do it when I'm done editing") and matches the manual-control pattern of the rest of the brand settings surface.

I'll surface this as the question right after the plan is approved — recommend **nudge by default**, with auto-regen reserved for the case where the cached file is *missing entirely* (one-time bootstrap, no owner action ever required).

---

### Out of scope

- Server-side raster rendering (would let us auto-regen from a logo-update DB trigger; deferred until real demand).
- Per-location splashes (currently all locations share `{orgId}.jpg`; if location-level branding becomes a thing, we'd key by `{orgId}-{locationId}.jpg`).
- Lockout countdown on the kiosk/dock surface — same RPC change benefits both, but the dock UI changes are tracked separately if you want them.

---

### Further enhancement suggestions (post-plan)

1. **Lockout audit signal.** When a device hits the 10-attempt cap, log a row to `notification_events` so owners see "iPad in Mesa hit PIN lockout 3x this week" in the Operations Hub — surfaces real abuse vs. a single fat-fingered staffer.
2. **Splash A/B preview.** Render two preview pans side-by-side: current cached splash vs. what regen would produce. Owners see exactly what changes before committing the upload.
3. **"Preview as a staffer would see it" install flow.** Add a button next to the splash preview that opens `/org/:slug/login` in a new tab with `?preview=splash` — fakes a fresh PWA launch (full-bleed splash → fade → login form) so owners can confirm the *whole* launch experience, not just the static image.