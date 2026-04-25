# Harden Wave — Branded Login & PIN System

Five surgical fixes addressing inconsistencies surfaced in the post-Wave-3 audit. Sequenced by **user-visible impact first**, structural hygiene last.

---

## Wave 1 — Lockout UX persistence (sessionStorage)

**Problem:** `pinLockoutUntil` lives in React state only. A staff member who refreshes (or whose iPad sleeps and reloads the PWA) loses the countdown and starts hammering the pad again — defeating the rate limit's signal.

**Changes:**
- `src/pages/OrgBrandedLogin.tsx` — replace `useState<number | null>` for `pinLockoutUntil` with a small `useSessionLockout(orgId)` hook that reads/writes `sessionStorage` under key `pin_lockout_until:{orgId}`.
- Hydrate on mount; clear when `Date.now() >= until` (already handled by `LockoutCountdown.onExpire`).
- Scope by `orgId` so a staffer hopping between two org tabs doesn't cross-contaminate.

**Why sessionStorage not localStorage:** lockout should not survive an explicit tab close (operator intent = fresh start). Refresh + sleep/wake = same tab session = preserved.

**Files:**
- `src/pages/OrgBrandedLogin.tsx` (refactor state)
- `src/hooks/useSessionLockout.ts` (new, ~25 lines)

---

## Wave 2 — Dock RPC alignment (`validate_dock_pin` returns `lockout_until`)

**Problem:** `validate_user_pin` returns `lockout_until` as a structured row (Wave 3 of the prior plan); `validate_dock_pin` still `RAISE EXCEPTION`s. The Dock surface shows a generic toast instead of a countdown — exact regression we just fixed on the login surface.

**Changes:**
- New migration: alter `validate_dock_pin` to return `(user_id, display_name, photo_url, is_super_admin, is_primary_owner, lockout_until)` matching `validate_user_pin`'s shape.
- Update Dock client (`src/hooks/useKioskPinValidation.ts` or the dock equivalent — verify before edit) to handle `lockout_until` and render `LockoutCountdown` in the dock pad.

**Files:**
- `supabase/migrations/{ts}_validate_dock_pin_lockout_response.sql`
- `src/hooks/useKioskPinValidation.ts`
- Dock PIN entry component (locate via `rg "useKioskValidatePin"`)

---

## Wave 3 — Surface isolation (`pin_attempt_log.surface` column)

**Problem:** Login attempts and Dock attempts share the same per-device + per-org counters. A stylist fat-fingering the Dock PIN can lock out the front-desk laptop, and vice versa. Different surfaces, different threat models, different counters.

**Changes:**
- Migration: `ALTER TABLE pin_attempt_log ADD COLUMN surface text NOT NULL DEFAULT 'login' CHECK (surface IN ('login','dock'))`.
- Add composite index `(target_org_id, surface, device_fingerprint, attempted_at DESC)`.
- Both RPCs gain `_surface text DEFAULT 'login'` parameter; all `INSERT` and `SELECT count(*)` clauses filter by surface.
- Client hooks pass surface explicitly (`useOrgValidatePin` → `'login'`, dock hook → `'dock'`).

**Backfill:** Existing rows default to `'login'` — safe because dock attempts before this migration were rare and the 1-hour log retention auto-purges within an hour anyway.

**Files:**
- `supabase/migrations/{ts}_pin_attempt_surface_isolation.sql`
- `src/hooks/useOrgPinValidation.ts`
- `src/hooks/useKioskPinValidation.ts`

---

## Wave 4 — Device-mode chooser gating

**Problem:** Per the audit, the recents picker can render before the user has confirmed Shared vs Personal mode on a cold install. This was partially addressed in the earlier nav-timing fix but not enforced as an invariant — there's no guard preventing future regression.

**Changes:**
- In `OrgBrandedLogin.tsx`, derive `showRecentsPicker` from a single boolean: `deviceMode !== null && !sessionUserHere && recents.length > 0 && !recentsBypassed && !recentSelected`.
- Today the check omits `deviceMode !== null`. Add it.
- Add a Vitest unit test asserting: when `localStorage[deviceMode] === null`, the chooser renders and the recents grid does not.

**Files:**
- `src/pages/OrgBrandedLogin.tsx` (one-line guard + test)
- `src/pages/__tests__/OrgBrandedLogin.deviceMode.test.tsx` (new)

---

## Wave 5 — `org-manifest` route hardening (UUID regex)

**Problem:** The `loc` query param is validated with slug regex `/^[a-z0-9-]+$/i` but used in a UUID `.eq('id', loc)` lookup. UUIDs happen to match the slug regex, so it works — but the contract is wrong. A future change to slug-based locations would silently break, and the loose regex is a tiny attack surface (DoS via 1000-char `loc` param hitting Postgres).

**Changes:**
- Tighten regex in `supabase/functions/org-manifest/index.ts` to strict UUID v4: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`.
- Same hardening in `supabase/functions/org-splash/index.ts` if it accepts a `loc` param (verify).
- Add a comment block documenting that `loc` is a UUID by contract (matches `App.tsx` route param `:locationId`).

**Files:**
- `supabase/functions/org-manifest/index.ts`
- `supabase/functions/org-splash/index.ts` (if applicable)

---

## Sequencing rationale

| Wave | Surface | Risk if deferred |
|------|---------|------------------|
| 1 | Login UX | Frontline staff bypass lockout via refresh — security control degrades |
| 2 | Dock UX | Dock users get worse UX than login users — inconsistency confuses ops |
| 3 | DB schema | Cross-surface lockouts hit at scale; harder to fix once data exists |
| 4 | Login UX | Cold-install regression risk; low frequency but high confusion |
| 5 | Edge fn | Contract drift only — no live bug today |

Waves 1–3 are independent and can ship in any order. Wave 4 is trivial. Wave 5 is hygiene.

---

## Out of scope (intentionally)

- **Lockout audit signal to Operations Hub** — separate plan, needs alert-governance review per `mem://architecture/alert-governance-and-throttling`.
- **A/B splash preview** — nice-to-have, not addressing a defect.
- **Auto-bootstrap missing splash** — would conflict with the "nudge over auto-trigger" doctrine we just chose.

---

## Further enhancement suggestions (post-wave)

1. **Lockout telemetry**: emit a `pin_lockout_triggered` event with `(org_id, surface, device_fp_hash)` so we can tell normal fat-finger lockouts from coordinated abuse — feeds future Visibility Contract for "device under attack".
2. **Surface-aware lockout copy**: "Too many PIN attempts on this iPad" (login) vs "Color Bar PIN locked — front desk can override" (dock). The countdown is identical; the recovery path differs.
3. **Lockout admin override**: a primary-owner-only "Clear lockout for this device" button in `TeamLoginUrlCard` for the inevitable "I locked myself out at 7am before my first client" support call.
