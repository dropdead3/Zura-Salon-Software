

## Wave 13 — Deferred docket cleanup

Pulled the deferred items across Waves 9–12 and re-checked each against the current code. Three are cheap and worth shipping; one is a real refactor; one was already addressed and just needs deletion.

### Ready to ship now (cheap, no migration)

**P2 — Delete dead `useServiceCategories`** (`useServicesData.ts:329-352`)
Defined but **zero callsites** (verified via grep). Wave 12 deferred adding an org filter — but the right move is deletion. ~24 lines removed.

**P2 — `useServiceSeasonalAdjustments` org-scope query key** (`useServiceSeasonalAdjustments.ts:19-39`)
Cache key is `['service-seasonal-adjustments', serviceId]` with no org dimension; global rows (`service_id IS NULL`) get joined into per-service caches. Add `organizationId` arg with context fallback, include in key, add `.eq('organization_id', orgId)` filter, gate `enabled: !!orgId`. ~6 lines.

**P2 — `useServiceFormRequirements` mutation key precision** (`useServiceFormRequirements.ts:99-208`)
Four mutations invalidate `['service-form-requirements']` (matches all variants via prefix). Working but inefficient — every link/unlink refetches every per-service variant across the whole org. Switch the org-list invalidation to `['service-form-requirements', orgId]` while leaving the per-service prefix invalidation intact. ~8 lines across 4 mutations + plumb `useOrganizationContext`.

### Real refactor (its own wave)

**`useServices` / `useServicesByCategory` clones in `useBookingSystem.ts`** (lines 121-156)
Flagged for 4 consecutive waves. **Reality check on callsites:**
- `useServices()` from useBookingSystem: 1 caller (`ServiceEmailFlowsManager.tsx:256`)
- `useServicesByCategory` from useBookingSystem: 0 callers — all 5 callsites import from `usePhorestServices` (a *third* clone with the same name)

So we actually have THREE `useServicesByCategory` implementations across the codebase (useBookingSystem, useServicesData, usePhorestServices) and all booking flows still go through the Phorest one. This is bigger than a rename — it's the Phorest decoupling pivot touching booking. **Defer to a dedicated Phorest-decoupling wave** (already on the docket per `mem://tech-decisions/phorest-decoupling-strategy`). Out of scope here.

### Already shipped — just clean up

**Search predicate extension** — verified shipped in Wave 11 ✓
**`pendingClientId` dead state in `HostedBookingPage`** — verified removed in Wave 11 ✓
**Reorder uses `resolvedOrgId`** — verified shipped in Wave 12 ✓

### Explicitly NOT shipping this wave

- **Reorder RPC consolidation** (CRDT-class race window) — needs its own design pass; current sequential writes are deterministic per-row.
- **`useUnsignedFormsForClient` "version changed" branch** — dead until product wants version-bumped re-signing.
- **`useService(serviceId)` org filter** — single-row lookup, RLS-safe, defense-in-depth gap is cosmetic.
- **`KioskFormSigningScreen` sign-in-flight loading state** — verified acceptable.

### Files touched

| File | Change |
|---|---|
| `src/hooks/useServicesData.ts` | Delete dead `useServiceCategories` (~24 lines) |
| `src/hooks/useServiceSeasonalAdjustments.ts` | Org-scope query key + filter + `enabled` guard |
| `src/hooks/useServiceFormRequirements.ts` | Tighten mutation invalidations to org-scoped key |

### Verification

1. Grep `useServiceCategories\(` → zero hits after deletion.
2. Open service editor → seasonal-adjustments tab loads; switch orgs → query key changes, no cache leak.
3. Link a form to a service → only the active org's `service-form-requirements` cache refetches (devtools).

### Recommended cutoff

- **Ship now:** All three P2s. ~40 lines, no migration, single wave.
- **Defer:** Booking-system clone refactor (Phorest decoupling wave).

### Prompt feedback

Strong prompt — *"any deferred items that need to be addressed and shipped?"* correctly framed this as docket triage rather than a fresh audit, which kept scope tight and let me re-verify what was actually shipped vs. what's still outstanding.

To level up: **add a "ship-readiness filter."** Phrases like *"deferred items ready to ship without new design work"* or *"deferred P2s only, skip refactors"* would have let me prune the booking-system rename in one line instead of explaining why it's still deferred. Pattern: **state the readiness threshold in the prompt = no need to re-litigate scope at presentation time.**

