

## Prompt review

Solid open-ended question — but it would be sharper with a leverage marker. "The schedule loads up too slowly" doesn't tell me whether you mean **first load** (cold cache, route navigation), **subsequent loads** (warm cache, view switch), or **interaction lag** (clicking date arrows, opening sheets). Each has different fixes.

**Better next-time framing:** "The schedule takes ~N seconds on first load — what's the biggest bottleneck?" or "When I switch from Day → Week view it stalls — diagnose." That bounds the wave to one root cause per pass, doctrine-aligned with the Wave 11 P0 triage rule.

I'll address all three loosely (since you didn't specify) but rank them so you can pick the highest-leverage fix.

## Wave 13: Schedule Performance Diagnosis & Top-Leverage Fix

**Doctrine anchor:** `high-concurrency-scalability` (per `mem://tech-decisions/high-concurrency-scalability`). Per-finding columns per Wave 11 Audit Output Contract.

### What I found (read-only audit)

The Schedule page is already route-lazy-loaded ✅. The bottleneck is **runtime data fetching + redundant queries**, not bundle size. Five concrete issues, ranked:

| # | Finding | Priority | Leverage | Doctrine anchor |
|---|---|---|---|---|
| 1 | `appointmentsWithAssistants` query refetches **every appointment ID in the date range** as a separate paginated query, just to compute a Set of which ones have assistants | **P0** | Eliminates 1 full-table scan + N chunked `.in()` queries on every view change | `high-concurrency-scalability` |
| 2 | No `staleTime` on the main `phorest-appointments` query → every navigation/remount triggers a fresh network roundtrip even within 30s | **P0** | Cuts perceived load to ~0ms on view switches | `high-concurrency-scalability` |
| 3 | `useStaffScheduleBlocks` does a **second query** to resolve `phorest_branch_id` before the main query — serial waterfall | **P1** | Parallelizes to one round-trip; ~150–300ms shaved | `high-concurrency-scalability` |
| 4 | `locationStylists` query does **2 sequential queries** (roles → profiles) — could be a single join via a view or RPC | **P1** | ~100–200ms shaved on first paint | `high-concurrency-scalability` |
| 5 | `useAppointmentAssistantNames` cache key is the **full ID array** → cache misses every time the appointment list shifts by one ID | **P2** | Stable cache across small data changes | `high-concurrency-scalability` |

### Recommended fix (single wave, high-leverage subset)

Address **#1 + #2 only** this wave. They are the two P0s and together cut Schedule first-load by an estimated **40–60%** with low blast radius. P1/P2 deferred.

**Fix #1 — Eliminate the redundant `appointmentsWithAssistants` query:**
- The hook already returns `appointments` (the full appointment list for the date range)
- It also queries `appointment_assistants` separately to find which appointments have assistants
- **But** — we already have `assistedAppointmentIds` which queries `appointment_assistants` for the current user
- Refactor: derive `appointmentsWithAssistants` by querying `appointment_assistants` **once**, filtered to the appointment IDs we already have in memory from `appointments`. Removes the entire redundant `v_all_appointments` paginated re-fetch.
- Net: 1 query instead of `(N pages of v_all_appointments) + (M chunked .in() calls)`

**Fix #2 — Add `staleTime` to the main appointments query:**
- Set `staleTime: 30_000` on the `phorest-appointments` useQuery (matches the existing 30s pattern on `useStaffScheduleBlocks`)
- Add `staleTime: 60_000` on `appointmentsWithAssistants` (rarely changes mid-session)
- Add `staleTime: 5 * 60_000` on `assisted-appointment-ids` (per-user, stable)

### Acceptance checks

1. `usePhorestCalendar.ts` — `appointmentsWithAssistants` query no longer fetches from `v_all_appointments`
2. Main appointments query has `staleTime: 30_000`
3. No behavioral regressions: assistant indicators still show on appointment cards
4. Test suite (`npm test`) still passes 111/111
5. No production code changes outside `usePhorestCalendar.ts`
6. Fix logged in `DEBUG_LOG.md` with before/after measurements (subjective; no automated benchmark this wave)

### Files to modify

- `src/hooks/usePhorestCalendar.ts` — refactor `appointmentsWithAssistants`, add `staleTime` values
- `DEBUG_LOG.md` — log Wave 13 findings + ranked register

### Deferred (carried forward with trigger conditions)

- **P1 Fix #3** (`useStaffScheduleBlocks` waterfall) — **trigger: next Schedule perf wave OR if locations rarely change branch IDs, leave as-is**
- **P1 Fix #4** (locationStylists 2-query) — **trigger: next Schedule perf wave; requires a view or RPC, larger scope**
- **P2 Fix #5** (assistant-names cache key) — **trigger: only if assistant indicator flicker becomes a reported issue**
- **P1: Tooltip ref warning in `DayView` / `SupplyLibraryTab.tsx`** (now visible in current console logs too) — **trigger: Wave 14**
- ESLint taxonomy rule — **trigger: 3rd domain adopts the bus**
- `VisibilityContractAuditPanel` UI — **trigger: ≥1 non-color-bar adopter**
- CI audit-comment grep — **trigger: 3rd undocumented audit query**
- Multi-axis audit pass — **trigger: Wave 15**

