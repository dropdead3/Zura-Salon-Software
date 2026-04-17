

## Prompt review

Sharp meta-feedback — all three suggestions are operational improvements to the *audit ritual itself*, not just findings. The "triage P0s individually" point is the most actionable: it directly addresses the trap where Wave 10's P0 #2 (lint regression: 1100 → 4322 errors) could swallow a week of investigation while P0 #1 (test regression) sits unfixed and blocks CI confidence on every subsequent wave.

The "doctrine anchor column" suggestion is the highest-leverage long-term: it makes audit findings *re-rankable* as doctrine evolves. A finding tagged `doctrine: visibility-contracts` becomes automatically re-prioritizable when that doctrine shifts.

The "wave-N-audit cadence" is correct but should be encoded as a Deferral Register entry itself (meta: the register tracks its own review cadence) — otherwise it becomes another well-intentioned ritual that decays.

## Plan — Wave 11: Triage P0 #1 (Test Regression) + Codify Audit Discipline

Two independent fixes, sequenced to unblock CI before tackling the lint rabbit hole:

### 1. Fix P0 #1: `ProtectedRoute.test.tsx` regression *(leverage: restores test confidence for all subsequent waves; ~15 min scope)*

**Root cause** (from Wave 10 findings): `ProtectedRoute` now consumes `useOrgDashboardPath()` which requires `OrganizationProvider`. The 6 failing tests don't wrap the component in that provider.

**Fix approach** — minimum viable:
- Read `src/components/auth/ProtectedRoute.test.tsx` to confirm current render setup
- Read `src/contexts/OrganizationContext.tsx` to identify the minimum mock shape
- Read `src/hooks/useOrgDashboardPath.ts` to confirm what it actually needs from the context
- Add a lightweight test wrapper that provides:
  - `OrganizationProvider` with a mocked organization (or a minimal `OrganizationContext.Provider` if mocking the full provider is heavy)
  - Existing `AuthContext`, `ViewAsContext`, `MemoryRouter` wrappers preserved
- Re-run tests to confirm 7/7 pass

**Scope guard:** if `OrganizationContext` requires a Supabase client mock or complex setup, fall back to mocking `useOrgDashboardPath` directly via `vi.mock('@/hooks/useOrgDashboardPath')`. That's the smaller blast radius.

**No behavior change** to `ProtectedRoute` itself — this is a test-infrastructure fix only.

### 2. Codify audit discipline in memory *(leverage: every future audit produces re-rankable findings; doctrine-anchored)*

**Modify:** `mem://architecture/visibility-contracts.md` (or new `mem://architecture/audit-discipline.md` if it grows past one section — decide during execution)

Add a **"Audit Output Contract"** section capturing the three meta-improvements from this prompt:

> **Every audit wave must produce findings with three mandatory columns:**
> 1. **Priority** (P0/P1/P2) — based on ship-blocking severity
> 2. **Doctrine anchor** — name the doctrine the finding serves or violates (e.g., `visibility-contracts`, `tenant-isolation`, `alert-governance`). Findings without an anchor are downgraded to P2 by default.
> 3. **Leverage marker** — the ROI sentence (e.g., "unblocks CI for all subsequent waves")
>
> **P0 triage rule:** P0 findings are addressed in *separate waves*, never bundled. Bundling risks one P0 (e.g., a lint rabbit hole) blocking another (e.g., a 15-minute test fix).
>
> **Cadence:** A multi-axis audit pass runs every 5 waves. The cadence is itself a Deferral Register entry with trigger condition: `current_wave % 5 == 0`.

**Update:** `mem://index.md` — add Core one-liner: "Audit findings require priority + doctrine anchor + leverage marker. P0s ship in separate waves."

**Update:** Deferral Register table in `mem://architecture/visibility-contracts.md` — add row:
| Item | Trigger Condition | Status |
|---|---|---|
| Multi-axis audit pass | `current_wave % 5 == 0` (next: Wave 15) | Pending |

## Acceptance checks

1. `src/components/auth/ProtectedRoute.test.tsx` — 7/7 tests pass after fix
2. No production code changes to `ProtectedRoute.tsx` itself
3. `mem://architecture/visibility-contracts.md` contains "Audit Output Contract" section with all three mandatory columns
4. `mem://index.md` Core rule reflects the audit discipline
5. Deferral Register includes the Wave 15 cadence trigger
6. P0 #2 (lint regression) explicitly *not* touched this wave — preserved for Wave 12 with full bandwidth
7. No new dependencies, no behavior changes outside the test wrapper

## Files to modify

- `src/components/auth/ProtectedRoute.test.tsx` — add test wrapper providing `OrganizationProvider` (or mock `useOrgDashboardPath`)
- `mem://architecture/visibility-contracts.md` — Audit Output Contract section + Deferral Register row
- `mem://index.md` — Core rule for audit discipline

## Files to read (pre-fix)

- `src/components/auth/ProtectedRoute.test.tsx`
- `src/contexts/OrganizationContext.tsx`
- `src/hooks/useOrgDashboardPath.ts`

## Deferred (carried forward with trigger conditions)

- **P0 #2: Lint regression diagnosis (1100 → 4322 errors)** — **trigger: Wave 12, dedicated wave**. Reason for separation: bundling with the test fix risks scope creep into ESLint config archaeology.
- **P1: Tooltip ref warning in `SupplyLibraryTab.tsx:94`** — **trigger: Wave 13 or alongside next color-bar work**
- **P1: Legacy `DEBUG_LOG.md` queue (Waves 2-5)** — **trigger: explicit re-prioritization; some items may now be superseded**
- ESLint taxonomy rule — **trigger: 3rd domain adopts the bus** (unchanged)
- `VisibilityContractAuditPanel` UI — **trigger: ≥1 non-color-bar adopter** (unchanged)
- CI audit-comment grep — **trigger: 3rd undocumented audit query** (unchanged)
- Multi-axis audit pass — **trigger: Wave 15** (new)

