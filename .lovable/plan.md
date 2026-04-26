# PIN Lockout — Owner Override + Pre-Lockout Warning

## Current policy (already shipping — no change)

| Rule | Value |
|---|---|
| Attempts before device lockout | **10** per (org, device, surface) per **5-min** rolling window |
| Lockout duration | **5 minutes** (decays as oldest attempt ages out) |
| Org-wide floor | `10 + (active_locations × 5)` attempts/5min before whole surface locks |
| Surface isolation | `login` vs `dock` lockouts are independent |
| Owner reset today | ❌ none |
| Pre-lockout warning today | ❌ none — generic "Incorrect PIN" until the wall hits |

This wave doesn't change the thresholds — it adds a **late-stage warning** and an **owner-only manual unlock** for the "I locked myself out at 7am" scenario.

---

## Wave 1 — Pre-lockout warning (alert-fatigue compliant)

**Doctrine check:** alert-fatigue rules ban cascading warnings, but a *single* high-confidence warning at the threshold prevents a support call entirely — it's signal, not noise.

- Update `validate_user_pin` and `validate_dock_pin` to return a new field `attempts_remaining int` alongside `lockout_until` on every call.
  - Computed as `GREATEST(0, 10 - v_device_attempts - 1)` after the failed attempt is logged.
  - Only surfaced to UI when `attempts_remaining <= 2` (so attempts 8 and 9 trigger it; 1–7 stay silent).
- `useOrgValidatePin` and `useKioskPinValidation` extend `PinValidationResult` with a new variant: `{ kind: 'no_match', attemptsRemaining?: number }`.
- `OrgBrandedLogin` + `DockPinGate` render an inline amber warning *below* the pad (not a toast) when `attemptsRemaining <= 2`:
  - "2 attempts left before this device is locked for 5 minutes"
  - Same `<ShieldAlert>` visual language as `LockoutCountdown` for continuity.

**Why this is doctrine-compliant:** silence is preserved for attempts 1–7, the warning fires only when materiality threshold (imminent lockout) is met, and it replaces — not competes with — the eventual countdown.

## Wave 2 — Database: override RPC + audit table

- New table `pin_lockout_overrides`:
  - `id`, `organization_id`, `cleared_by_user_id`, `device_fingerprint`, `surface`, `attempts_cleared int`, `created_at`
  - RLS: only org admins can SELECT (for transparency on who unlocked what); INSERT only via the security-definer RPC.
- New RPC `clear_device_pin_lockout(_organization_id uuid, _device_fingerprint text, _surface text)`:
  - Security definer.
  - **Hard-gated** to `employee_profiles.is_primary_owner = true` for that org. Super admins (god mode) also pass. Regular org admins are rejected.
  - Deletes matching rows from `pin_attempt_log` within the active 5-min window.
  - Inserts a row into `pin_lockout_overrides` with the count of cleared attempts.
  - Returns `{ cleared_count int }`.

## Wave 3 — Client hook + sessionStorage reset

- `src/hooks/useClearDeviceLockout.ts`:
  - Mutation wrapping the RPC.
  - On success, calls `useSessionLockout(orgId).clearLockout()` to wipe the local countdown immediately.
  - Invalidates the `org-login-team` query so the recents grid re-enables.

## Wave 4 — Owner-only UI in TeamLoginUrlCard

**Scope decision (open question from last round):** current device only. Rationale:
- The ask is "I locked myself out at 7am" — single-device recovery.
- Listing every locked device in the org needs a new query, audit surface, and a "which devices" picker — that's a separate wave (admin device console).
- Current device matches the one-tap mental model and minimises blast radius.

UI behaviour:
- Section appears **only** when `useIsPrimaryOwner()` returns true. Hidden entirely from non-owners (no disabled state — avoids drawing attention to a feature they can't use).
- Visually muted card footer below the existing splash preview block:
  - Label: "Locked yourself out?"
  - Body: "Clears the 5-minute PIN lockout on this device. Logged for audit."
  - Button uses `tokens.button.cardAction` (pill, h-9), variant `ghost` — deliberately not a primary CTA.
- Confirms via `AlertDialog` showing the truncated device fingerprint (first 8 chars) so the owner sees *which* device they're unlocking.
- After success: toast "Lockout cleared on this device" + the `LockoutCountdown` on `/org/:slug/login` disappears immediately (sessionStorage cleared).

## Wave 5 — Apply same primitives to dock parity

- The same `useClearDeviceLockout` hook works for the `dock` surface (just pass `surface: 'dock'`).
- No UI added to the dock itself (an owner locked out of the dock is at the dock, not in settings) — but the RPC accepts `surface` so a future "Unlock dock from dashboard" surface is one prop away.

---

## Files

**New**
- `supabase/migrations/[ts]_pin_lockout_warning_and_override.sql` — adds `attempts_remaining` to both RPCs, creates `pin_lockout_overrides` + `clear_device_pin_lockout` RPC.
- `src/hooks/useClearDeviceLockout.ts`

**Edited**
- `src/hooks/useOrgPinValidation.ts` — surface `attemptsRemaining` on `no_match`
- `src/hooks/useKioskPinValidation.ts` — same
- `src/pages/OrgBrandedLogin.tsx` — inline warning when ≤2 attempts left
- `src/components/dock/DockPinGate.tsx` — same warning treatment
- `src/components/auth/LockoutCountdown.tsx` — no change (already correct)
- `src/components/dashboard/settings/TeamLoginUrlCard.tsx` — owner-only override section
- `src/integrations/supabase/types.ts` — auto-regenerated

## Out of scope (deferred — flag in memory if approved)

- Multi-device "currently locked devices" admin console (needs `pin_attempt_log` SELECT RLS for owners + a polling query — heavier).
- Configurable thresholds per org (today's 10/5min is sane for every persona).
- Email/SMS alert to owner when an override is used (audit table is enough; alerts would compete with the existing alert governance throttle).

---

**Prompt feedback (per your standing rule):** Strong prompt — bundling the 4 sub-questions ("how many attempts / how long / can owner reset / is there a warning") with the redraft request let me ground the plan in the actual policy instead of guessing thresholds. One refinement for next time: when you ask "is there a warning to owner for many attempts," specify the audience — *staff* (the person typing the PIN) vs *org owner* (the operator). I assumed staff because that's where the support-call risk lives; if you meant an owner-side notification ("Sarah's iPad triggered a lockout"), that's a different surface (Operations Hub event feed) and would change Wave 1 scope.

**Further enhancements after this ships:**
1. Lockout heatmap in Operations Hub — which devices/surfaces trigger lockouts most often (real abuse vs UX friction signal).
2. Auto-expire `pin_lockout_overrides` rows after 90 days to keep the audit table lean.
3. Optional "remember this device for 12h" trust token after successful PIN entry — reduces re-entry friction on shared iPads without weakening the lockout policy.
