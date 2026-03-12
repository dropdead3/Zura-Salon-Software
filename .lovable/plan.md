

# Zura Backroom — Phase 1 Implementation Plan

Phase 1 is already largely built. This plan addresses the **6 identified gaps** that prevent the end-to-end workflow from functioning correctly.

---

## Gap Analysis

| # | Gap | Impact |
|---|---|---|
| 1 | `handleCompleteSession` does not save formulas — lines 124-129 are a placeholder | Formula is never persisted to `client_formula_history` |
| 2 | `SessionSummary` for completed sessions receives `bowls={[]}` (line 245) | Past session summaries show 0 bowls, 0 cost, 0 usage |
| 3 | Bowl `total_dispensed_weight` and `total_dispensed_cost` are never updated when lines are added | Bowl card shows live-calculated values, but DB columns stay at 0; session summary breaks |
| 4 | `sequence_order` is hardcoded to `0` on every line add (line 161) | All lines have the same order |
| 5 | `handleMoveToReweigh` doesn't auto-seal — it rejects if any bowls are open, but there's no batch-seal UX | Friction: user must manually seal each bowl before moving to reweigh |
| 6 | `ReweighPanel` is inline in `BowlCard` but reweigh + status update fire as two separate uncoordinated mutations | Race condition: bowl could be marked `reweighed` before reweigh event is committed |

---

## Implementation Tasks

### 1. Wire formula save on session completion

**File:** `src/components/dashboard/backroom/MixSessionManager.tsx` (lines 108-130)

Replace the placeholder with a function that:
- Fetches all bowl lines across all non-discarded bowls for the session (batch query: `mix_bowl_lines` WHERE `bowl_id` IN `[bowl_ids]`)
- Calls `extractActualFormula()` from `mix-calculations.ts` to build the actual formula
- Calls `extractRefinedFormula()` using each bowl's `total_dispensed_weight` and `net_usage_weight`
- Calls `saveFormula.mutateAsync()` twice (once for `actual`, once for `refined`) with the session's `organization_id`, `client_id`, `appointment_id`, `mix_session_id`, `service_name`, `staff_id`, `staff_name`
- Only saves if `clientId` is present
- Shows toast on success/failure

**API contract:** No new endpoints. Uses existing `useSaveFormulaHistory` and `supabase.from('mix_bowl_lines').select('*').in('bowl_id', bowlIds)`.

### 2. Load bowls for completed session summaries

**File:** `src/components/dashboard/backroom/MixSessionManager.tsx` (line 245)

Create a `CompletedSessionSummary` wrapper component (similar to `BowlCardWithLines`) that:
- Takes a session ID
- Calls `useMixBowls(session.id)` to fetch bowls
- Renders `SessionSummary` with actual bowl data

### 3. Update bowl totals when lines change

**File:** `src/hooks/backroom/useMixBowlLines.ts`

In the `onSuccess` callbacks of `useAddBowlLine` and `useDeleteBowlLine`:
- After invalidating `mix-bowl-lines`, fetch all current lines for the bowl
- Calculate `total_dispensed_weight` and `total_dispensed_cost` using `calculateBowlWeight()` and `calculateBowlCost()`
- Update the bowl record via `supabase.from('mix_bowls').update({ total_dispensed_weight, total_dispensed_cost }).eq('id', bowlId)`
- This ensures the DB columns are always in sync for session summary calculations

### 4. Auto-increment sequence_order

**File:** `src/components/dashboard/backroom/MixSessionManager.tsx` (line 161)

Change `handleAddLine` to pass `sequence_order: lines.length + 1` where `lines` is available. Since `BowlCardWithLines` already fetches lines, thread the current line count up through the `onAddLine` callback, or calculate it from the bowl's lines in the hook.

Simpler approach: in `useAddBowlLine`, before inserting, query the max `sequence_order` for the bowl and use `max + 1`.

### 5. Add batch-seal option before reweigh

**File:** `src/components/dashboard/backroom/MixSessionManager.tsx` (lines 93-106)

Change `handleMoveToReweigh` to:
- If open bowls exist with lines, auto-seal them all (fire `updateBowlStatus` for each)
- If open bowls exist with no lines, auto-discard them
- Then transition the session to `pending_reweigh`
- Show a confirmation toast listing what was auto-sealed/discarded

### 6. Coordinate reweigh event + bowl status update

**File:** `src/components/dashboard/backroom/MixSessionManager.tsx` (lines 179-203)

Change `handleReweighBowl` to:
- `await createReweigh.mutateAsync(...)` first
- Only then call `updateBowlStatus.mutate(...)` to mark as `reweighed`
- If the reweigh insert fails, the bowl stays `sealed` (correct behavior)

---

## No Schema Changes Required

All 8 tables are already deployed. No new migrations needed for Phase 1 completion.

---

## State Machines (Already Implemented — No Changes)

- **Session:** `draft → mixing → pending_reweigh → completed` / `draft|mixing → cancelled`
- **Bowl:** `open → sealed → reweighed` / `open|sealed → discarded`
- **Scale:** `manual_override` only (Phase 1)

---

## Service Boundaries (No Changes)

| Module | File | Responsibility |
|---|---|---|
| Calculations | `src/lib/backroom/mix-calculations.ts` | Pure deterministic math |
| Session FSM | `src/lib/backroom/session-state-machine.ts` | Session lifecycle |
| Bowl FSM | `src/lib/backroom/bowl-state-machine.ts` | Bowl lifecycle |
| Scale adapter | `src/lib/backroom/scale-adapter.ts` | Manual entry (Phase 1) |
| Weight schema | `src/lib/backroom/weight-event-schema.ts` | Normalized events |

---

## Frontend Components (No New Components)

All 11 components exist. Changes are limited to:
- `MixSessionManager.tsx` — wire formula save, fix sequence_order, batch-seal, coordinate reweigh
- `useMixBowlLines.ts` — sync bowl totals on line add/delete
- New `CompletedSessionSummary` wrapper (small inline component)

---

## Edge Case Handling

| Edge Case | Handling |
|---|---|
| **No client on appointment** | Skip formula save entirely; toast "No client linked — formula not saved" |
| **Zero lines in a bowl** | Auto-discard on batch-seal during move-to-reweigh |
| **Reweigh DB insert fails** | Bowl stays `sealed`; user can retry |
| **Session completed with unreweighed bowls** | Already handled: `unresolved_flag = true` |
| **Concurrent line adds** | `sequence_order` uses MAX query; last-writer-wins is acceptable |
| **Bowl totals drift** | Recalculated on every line add/delete from source lines |

---

## Test Plan

| Test | Type | Verification |
|---|---|---|
| Start session → add bowl → add 2 lines → seal → reweigh → complete | E2E | Session status = `completed`, formula saved to `client_formula_history` |
| Complete session with no client | E2E | No formula saved, no error, toast displayed |
| Multi-bowl session (3 bowls) | E2E | Each bowl has independent lines, all reweighed, session cost = sum of bowl costs |
| Discard a bowl mid-session | E2E | Discarded bowl excluded from formula, session completes normally |
| Skip reweigh and force-complete | E2E | `unresolved_flag = true`, `unresolved_reason` populated |
| Completed session summary shows real data | UI | `SessionSummary` displays correct bowl count, net usage, cost |
| Bowl totals update on line add/delete | DB | `mix_bowls.total_dispensed_weight` matches sum of line quantities |
| Sequence order auto-increments | DB | Lines ordered 1, 2, 3 in insertion order |

---

## Implementation Order

1. Fix bowl totals sync in `useMixBowlLines.ts` (prerequisite for correct summaries)
2. Auto-increment `sequence_order` in `useAddBowlLine`
3. Coordinate reweigh mutations in `handleReweighBowl`
4. Add batch-seal in `handleMoveToReweigh`
5. Wire formula save in `handleCompleteSession`
6. Add `CompletedSessionSummary` wrapper for past sessions

