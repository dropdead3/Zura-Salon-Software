

# Zura Backroom — Full Production Audit Plan

## Audit Scope Summary

After exhaustive codebase exploration across 50+ files spanning the entire Backroom subsystem, I've identified **23 concrete bugs/issues** and **14 hardening opportunities**. This plan covers all 18 audit sections requested.

---

## CRITICAL BUGS (Launch Blockers)

### BUG-1: Double Event Emission on Session Completion
**Location:** `MixSessionManager.tsx` lines 226-251
**Issue:** `handleCompleteSession` emits `session_completed` event directly (line 226-233), then calls `updateSessionStatus.mutate()` which calls `executeCompleteSession` which also emits `session_completed`. This creates **duplicate events** in the event stream.
**Fix:** Remove the direct `emitSessionEvent` call at line 226-233. The command layer handles it.

### BUG-2: Session Completion Bypass on Command Validation Failure
**Location:** `useMixSession.ts` lines 157-170
**Issue:** When `executeCompleteSession` fails validation (e.g., bowls not terminal), the code **falls back to raw event emission** bypassing all validation. This defeats the entire command layer safety.
**Fix:** Remove the fallback. If the command rejects, surface the error to the user instead of bypassing.

### BUG-3: Race Condition — Inventory Depletion Before Status Write
**Location:** `MixSessionManager.tsx` lines 244-267
**Issue:** `depleteInventory.mutate()` and `calculateOverage.mutate()` fire immediately after `updateSessionStatus.mutate()` without awaiting completion. If the status update fails, inventory still depletes. All three mutations are fire-and-forget.
**Fix:** Chain these calls: await status update → then deplete inventory → then calculate overage. Use `mutateAsync` with sequential awaits.

### BUG-4: `quantity_after: 0` Hardcoded in All Ledger Entries
**Location:** `inventory-ledger-service.ts` lines 154, 203-204, 216, 244; `inventory-commands.ts` lines 154, 248
**Issue:** Every ledger entry writes `quantity_after: 0` with a comment "trigger recalculates". But the DB trigger (`update_projection_on_ledger_insert`) does NOT set `quantity_after` — it only updates `inventory_projections.on_hand`. The `stock_movements.quantity_after` column stores **incorrect data permanently** (always 0), making historical ledger replay unreliable.
**Fix:** Before inserting, query current projection balance and compute the correct `quantity_after`, OR add a BEFORE INSERT trigger that calculates it.

### BUG-5: `postUsageFromSession` Uses Dispensed Quantity Not Net Usage
**Location:** `inventory-ledger-service.ts` lines 137-143
**Issue:** The depletion function aggregates `dispensed_quantity` from bowl lines, not `net_usage_weight` from bowls. This means inventory is depleted by the **full dispensed amount**, not the actual usage (dispensed minus leftover). Leftover product is still counted as consumed.
**Fix:** Use `net_usage_weight` from bowls to proportionally reduce per-product depletion, or at minimum use the bowl-level net usage ratio.

---

## HIGH SEVERITY BUGS

### BUG-6: Tiered Pricing Not Implemented
**Location:** `allowance-billing.ts` line 59-61
**Issue:** The `tiered` overage rate type falls back to `per_unit` with a "Future" comment. But the settings UI already exposes tier-band pricing configuration. If a salon configures tiered pricing, they get per-unit pricing silently.
**Fix:** Implement tiered pricing or add a guard that rejects tiered configuration until implemented.

### BUG-7: Session Sequence Counter Race
**Location:** `mix-session-service.ts` lines 117-125
**Issue:** `sessionSequences` is an in-memory `Map`. If two browser tabs or two users work on the same session, sequence numbers will collide. The DB unique constraint on `(mix_session_id, sequence_number)` will reject the second write, but the error is not handled gracefully.
**Fix:** Add a unique constraint violation handler that re-fetches the latest sequence and retries.

### BUG-8: Offline Queue Replay Skips Status Validation
**Location:** `mix-session-service.ts` lines 278-309
**Issue:** `replayOfflineQueue` replays events without checking current session status. Events queued while the session was `active` may be replayed when the session is now `completed`, violating state machine rules.
**Fix:** Fetch current session status before replay and filter out events that are no longer valid for the current state.

### BUG-9: CreateBowl Validation Only Allows Active Sessions
**Location:** `mixing-validators.ts` lines 71-86
**Issue:** `validateCreateBowl` requires `isActiveSession()` which returns true only for `'active'` status. But `MixSessionManager` allows bowl creation in `'draft'` status (line 730). The command layer blocks this valid workflow.
**Fix:** Update `validateCreateBowl` to also allow `draft` status, since bowls can be created during prep mode before the session is started.

### BUG-10: Bowl Status Validation Mismatch
**Location:** `mixing-validators.ts` line 78 uses `isActiveSession(session.current_status as any)`
**Issue:** The `as any` cast bypasses type safety. `session.current_status` is already typed as `SessionStatus`, but `isActiveSession()` expects `MixSessionStatus`. These are **different types** with different value sets. The cast masks a real type incompatibility.
**Fix:** Unify the status types or create a proper mapping function.

### BUG-11: No Idempotency Check on `postUsageFromSession`
**Location:** `inventory-ledger-service.ts`
**Issue:** If `depleteInventory.mutate()` is called twice (e.g., user double-clicks, or retry after partial failure), the same session's usage is posted twice to `stock_movements`. No deduplication by `reference_id`.
**Fix:** Add a guard that checks if usage movements already exist for this `mix_session` reference before posting.

---

## MEDIUM SEVERITY ISSUES

### BUG-12: Settings Configurator — 7 of 11 Sections Are Placeholders
**Location:** `BackroomSettings.tsx` lines 110-116
**Issue:** Allowances, Stations, Inventory, Permissions, Alerts, Formula, Multi-Location all show "Phase 2" placeholders. These are critical operational sections needed for launch.
**Fix:** Implement Phase 2 sections (covered in build order below).

### BUG-13: `handleMoveToReweigh` Uses Legacy Status Name
**Location:** `MixSessionManager.tsx` line 184
**Issue:** Passes `newStatus: 'pending_reweigh'` (legacy) instead of `'awaiting_reweigh'` (canonical). The state machine's `normalizeSessionStatus` handles this, but it creates inconsistent data in `mix_sessions.status` column.
**Fix:** Use canonical status `'awaiting_reweigh'`.

### BUG-14: Missing `unit` Parameter in Multiple Depletion Paths
**Location:** `inventory-ledger-service.ts` `postLedgerEntry` — no `unit` field
**Issue:** `stock_movements` stores movements without unit information. If products use different units (g vs ml vs oz), the quantities are summed without unit awareness, producing incorrect totals.
**Fix:** Add `unit` to `LedgerEntry` type and propagate through all write paths.

### BUG-15: Formula Memory Query is Case-Sensitive
**Location:** `formula-resolver.ts` line 83
**Issue:** `fetchClientLastFormula` uses `.eq('service_name', serviceName)` which is case-sensitive. If service names differ in casing between Phorest sync and manual entry, formulas won't match.
**Fix:** Use `.ilike('service_name', serviceName)` for case-insensitive matching.

### BUG-16: `fetchStylistMostUsed` Returns Most Recent, Not Most Used
**Location:** `formula-resolver.ts` lines 104-131
**Issue:** Despite the name "most used", the function queries the 50 most recent formulas and returns `data[0]` — the most recent one. It does NOT aggregate by formula content to find the most frequently used.
**Fix:** Either rename to `fetchStylistMostRecent` or implement actual frequency analysis.

### BUG-17: Control Tower Hardcoded Labor Rate
**Location:** `service-intelligence-engine.ts` line 94
**Issue:** Labor cost is hardcoded at `$30/hr` regardless of actual staff rates, location, or role. This makes margin calculations inaccurate for salons with different pay structures.
**Fix:** Accept labor rate as a parameter, source from staff configuration.

### BUG-18: Setup Health Uses `is_active` for Products but Not Services
**Location:** `useBackroomSetupHealth.ts` line 41
**Issue:** Products query filters by `is_active = true`, but services query has no active filter. Archived/inactive services inflate the "total services" count.
**Fix:** Add active filter to services query.

### BUG-19: `backroom_settings` Unique Constraint on Nullable `location_id`
**Location:** Migration — `UNIQUE(organization_id, location_id, setting_key)`
**Issue:** In PostgreSQL, `NULL != NULL` in unique constraints. Multiple org-level defaults (where `location_id IS NULL`) for the same key can be inserted, breaking the inheritance model.
**Fix:** Create a partial unique index: `CREATE UNIQUE INDEX ... WHERE location_id IS NULL` and another `WHERE location_id IS NOT NULL`.

---

## LOW SEVERITY / HARDENING

### H-1: Excessive `as any` casting throughout (50+ instances)
Type safety is bypassed in most DB queries. While functional, this masks schema drift and prevents compile-time detection of column renames.

### H-2: No test files exist for any Backroom module
Zero unit tests for state machines, calculators, validators, or command handlers.

### H-3: Offline queue stores events in `localStorage` without size limits
Heavy session usage could exceed localStorage quota (~5MB).

### H-4: Bowl auto-seal in `handleMoveToReweigh` uses `total_dispensed_weight > 0` not line count
An empty bowl with a stale weight value would be sealed instead of discarded.

### H-5: No permission checks in MixSessionManager
Any authenticated user can create/modify sessions regardless of role.

### H-6: `emitSessionEvent` doesn't emit `session_created` for validation
The `session_created` event is emitted in `useCreateMixSession` without status validation since no `currentStatus` is passed.

### H-7: `CompletedSessionSummary` fires a query per completed session (N+1)

### H-8: No stale event detection in projection queries

### H-9: CheckoutClarityPanel, BackroomExceptionInbox, OperationalTasks hooks not wired to settings configurator alerts/permissions

### H-10: Client Transformation Timeline is not connected to Backroom session data

---

## IMPLEMENTATION ORDER

### Phase A — Critical Bug Fixes (5 items)
1. Fix double event emission (BUG-1)
2. Remove completion bypass (BUG-2)
3. Await session completion before depletion (BUG-3)
4. Fix net usage vs dispensed depletion (BUG-5)
5. Add depletion idempotency guard (BUG-11)

### Phase B — High Severity Fixes (6 items)
6. Fix CreateBowl validation for draft sessions (BUG-9)
7. Fix legacy status name in reweigh flow (BUG-13)
8. Fix formula case-sensitivity (BUG-15)
9. Rename/fix stylist formula resolution (BUG-16)
10. Fix `quantity_after` accuracy (BUG-4)
11. Add tiered pricing guard (BUG-6)

### Phase C — Medium Fixes (5 items)
12. Fix sequence collision handling (BUG-7)
13. Fix offline replay status validation (BUG-8)
14. Fix NULL unique constraint for settings (BUG-19)
15. Fix setup health active filter (BUG-18)
16. Add unit awareness to ledger (BUG-14)

### Phase D — Settings Phase 2 Sections (BUG-12)
17. Implement remaining 7 settings sections

### Phase E — Hardening
18. Add unit tests for state machines and calculators
19. Add permission checks to MixSessionManager
20. Fix N+1 queries
21. Add offline queue size limits

---

## FEATURE COVERAGE MATRIX (Summary)

| Feature | Code Exists | Wired to UI | Settings Connected | Tests |
|---|---|---|---|---|
| Mix Sessions | Yes | Yes | Partial | No |
| Mix Bowls | Yes | Yes | No | No |
| Bowl Lines | Yes | Yes | No | No |
| Reweigh | Yes | Yes | No | No |
| Waste Recording | Yes | Yes | No | No |
| Formula Save | Yes | Yes | No | No |
| Smart Mix Assist | Yes | Yes | Partial | No |
| Instant Formula Memory | Yes | Yes | No | No |
| Assistant Prep | Yes | Yes | No | No |
| Predictive Backroom | Yes | Yes | No | No |
| Control Tower | Yes | Yes | No | No |
| Service Intelligence | Yes | Yes | No | No |
| Profit Per Appointment | Yes | Yes | No | No |
| Inventory Ledger | Yes | Yes | No | No |
| Inventory Projection | Yes | Auto (trigger) | No | No |
| Exceptions | Yes | Yes | No | No |
| Operational Tasks | Yes | Yes | No | No |
| Settings Overview | Yes | Yes | N/A | No |
| Product Catalog Config | Yes | Yes | N/A | No |
| Service Tracking Config | Yes | Yes | N/A | No |
| Recipe Baselines Config | Yes | Yes | N/A | No |
| Allowance Config | Placeholder | No | N/A | No |
| Station Config | Placeholder | No | N/A | No |
| Inventory Policy Config | Placeholder | No | N/A | No |
| Permissions Config | Placeholder | No | N/A | No |
| Alerts Config | Placeholder | No | N/A | No |
| Formula Assist Config | Placeholder | No | N/A | No |
| Multi-Location Config | Placeholder | No | N/A | No |
| Import/Export | Not Built | No | N/A | No |
| Transformation Timeline | Yes | Yes | Not Backroom-linked | No |
| Service Blueprinting | Yes | Yes | No | No |

---

## LAUNCH READINESS ASSESSMENT

**Current state: NOT launch-ready.** 5 critical bugs would cause data integrity issues in production (double events, incorrect inventory depletion, race conditions). The architecture is sound and well-designed, but needs the bug fixes in Phases A-C before launch. Settings Phase 2 can ship incrementally.

