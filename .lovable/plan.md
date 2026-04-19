

## Wave 10 audit — remaining gaps after Wave 9

Three real gaps + two carryovers + one Wave 9 false-positive worth correcting in the record. Tight scope.

### Real gaps still present

**P1 — `useServiceFormRequirements()` org-wide list never got the org filter** (`src/hooks/useServiceFormRequirements.ts:28-44`)
Wave 9 plan called for `organizationId` arg + `services!inner.organization_id` filter; it shipped only on the per-service variant. The org-wide list still selects every requirement across every tenant (RLS now blocks it, but the 1000-row default cap silently truncates at scale, and the doctrine says *"All queries filter by organization, include orgId in query keys"*).
**Fix:** Add `organizationId` arg, inner-join filter on `services.organization_id`, include in query key.

**P1 — Three duplicate `services-with-form-count` invalidation lines remain** (`useServiceFormRequirements.ts:91, 133, 157` — the actual key name is `services-with-form-count`, just renamed-then-readded as `service-form-counts` and `required-forms-for-services`).
After re-read these are not dead — they invalidate the active `useServiceFormCounts` and `useRequiredFormsForServices` keys correctly. **No action.** Audit was wrong on this in Wave 9.

**P2 — Staff `NewBookingSheet` still uses raw amber/emerald classes** (`NewBookingSheet.tsx:758-763`)
Doctrine: *"Raw class strings are prohibited when a token exists."* Should be `bg-warning/10 border-warning/40 text-warning` and `bg-success/10 border-success/40 text-success` from the semantic token system. Carried over from Wave 7.

**P2 — `useServices`/`useServicesByCategory` clones still in `useBookingSystem.ts:121-145`**
Wave 9 explicitly deferred the rename to a focused booking-flow pass. Still deferred — flagging only so it stays on the docket. No action this wave.

### Wave 9 false positives worth recording

**P0 (Wave 9) — `level_pricing` / `stylist_service_overrides` / `service_location_pricing` "no policies"**
These tables **don't exist** in the database. Verified via `information_schema.columns` — zero rows for all three names. The closest real tables are `service_stylist_price_overrides`, `level_commission_overrides`, etc. — different schema, different concerns, all have policies.
**Action:** No migration needed; mark Wave 9 finding closed-as-invalid in the audit log so it doesn't get re-flagged.

**P0 (Wave 9) — `service_form_requirements` RLS open**
Verified shipped: SELECT/INSERT/UPDATE/DELETE all gated through parent `services` org check via `EXISTS`. **Closed.**

### Verification done in this audit

- `services` RLS: scoped to `is_org_member`/`is_org_admin` ✓
- `service_form_requirements` RLS: parent-joined org check on all four operations ✓
- `service_audit_log` RLS: SELECT scoped to org admins, INSERT to org members ✓
- `service_category_colors`: all four policies org-scoped (with NULL bypass for legacy seeds) ✓
- `useReorderCategories`: sequential writes + org filter ✓
- Public-booking inline form gating: modal mounted, card rendered, edge-function validation server-side ✓
- Hotkey unique index: present ✓

### Files touched

| File | Change |
|---|---|
| `src/hooks/useServiceFormRequirements.ts` | Add `organizationId` arg + inner-join filter on org-wide list hook |
| `src/components/dashboard/schedule/NewBookingSheet.tsx` | Swap raw amber/emerald for `warning`/`success` semantic tokens (4 lines) |

### Out of scope / explicit defer

- `useServices`/`useServicesByCategory` rename (5-call-site booking refactor, needs its own pass).
- `KioskFormSigningScreen` props plumbing — verified working but uses `isLoading` only for initial fetch, not for sign-in-flight; acceptable.
- The `useUnsignedFormsForClient` "once + version changed" branch is dead code (line 132-136 — comment says "for now we don't require re-signing"). Defer until product wants version-bumped re-signing.

### Recommended cutoff

- **Ship now:** P1 org filter + P2 token swap. ~15 lines across 2 files. No migration.
- **Defer:** Booking-system rename (its own wave).

### Prompt feedback

Clean prompt — *"do any gaps or bugs remain?"* with the implicit "after the prior wave" framing got me to scope this as a delta audit instead of re-running the full sweep. Pattern works.

To level up: the prompt didn't ask me to **verify Wave 9's findings actually shipped** — but I caught the two false-positives (non-existent pricing tables + already-shipped form-req RLS) only by re-querying the DB. If you'd said *"verify what shipped, then flag what's left"* I'd have led with the verification table instead of burying it. Pattern: **ask for verification + delta in the same prompt** so audits don't accumulate stale assumptions across waves.

