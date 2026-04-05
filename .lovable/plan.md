

# Levels System Audit — Remaining Gaps and Enhancements

## Gaps Found

### 1. Fake Trend Arrows in Scorecard (High Priority)
The `getTrend()` function in `StylistScorecard.tsx` (line 393) is a **fake heuristic** — it just checks if the current value is above 80% or 100% of target and shows up/flat/down arrows. It does NOT compare current window vs. prior window, which the plan originally called for. The data to do this exists — `useLevelProgress` already fetches 2x the eval window of appointment and sales data. This needs to compute actual period-over-period comparison.

### 2. Peer Averages: Retention Rate Always Zero
`useStylistPeerAverages.ts` line 144 hardcodes `avgRetentionRate: 0` with comment "requires dual-window — deferred." The hook already fetches appointments with `client_id` — it just needs the same dual-window logic used in `useLevelProgress` (`computeMetrics`). This means the Scorecard's retention rate peer comparison always shows "—".

### 3. Peer Averages: No 1000-Row Pagination
The peer appointments query (line 69-83) has no pagination — it will silently truncate at 1000 rows for busy salons with many peers. `useLevelProgress` already handles this with a `while(hasMore)` loop.

### 4. Scorecard Hidden When at Top Level
`StylistScorecard.tsx` line 144: `if (!progress || (!progress.nextLevelLabel && !progress.retention?.isAtRisk))` — if a top-level stylist has no retention risk, the entire scorecard disappears. They should still see their KPI performance, Color Bar metrics, and peer context even without a "next level" to target.

### 5. Commission Rate Parsing Bug
`StylistScorecard.tsx` lines 92-95: Commission rates are multiplied by 100 (`Math.round(currentSvcRate * 100)`) but the database stores them as decimals (e.g., 0.42 for 42%). However, the editor stores them as strings like "42" (percentage already). If the DB value is `0.42`, the display shows `42%` correctly. But if the Quick Setup wizard stores `42` directly, this would show `4200%`. Need to verify the source format.

### 6. Peer Averages: Time-Off Not Excluded
`useStylistPeerAverages` calculates utilization using raw active days without excluding approved time off. The individual-level hooks (`useLevelProgress`) were updated to exclude time off, but peer averages were not.

### 7. No "New Clients" in Peer Averages
The `PeerAverages` interface is missing `avgNewClients` — a KPI that exists in both promotion and retention criteria. The scorecard's `getPeerValue` function returns `null` for `new_clients`.

---

## Plan

### A. Fix Trend Arrows — Real Period-over-Period (`StylistScorecard.tsx`)
- Extend `useLevelProgress` to return prior-window metrics alongside current-window metrics (data already fetched)
- Add `priorCurrent` field to `CriterionProgress` interface
- Update `getTrend()` to compare `current` vs `priorCurrent` with a meaningful threshold (e.g., 3% change = trend)

### B. Implement Peer Retention Rate (`useStylistPeerAverages.ts`)
- Expand the fetch window to 2x evalDays (same pattern as `useLevelProgress`)
- Compute prior-window vs current-window client overlap per peer
- Average across peers

### C. Add Pagination to Peer Appointments Query (`useStylistPeerAverages.ts`)
- Add the same `while(hasMore)` pagination loop used in `useLevelProgress`

### D. Show Scorecard for Top-Level Stylists (`StylistScorecard.tsx`)
- Remove the early-return guard that hides the card when there's no next level
- When `nextLevelLabel` is null, show "Current Performance" instead of the progression arrow
- Hide the readiness bar and commission uplift sections (not applicable)
- Keep KPI table, Color Bar, coaching signals visible

### E. Add New Clients to Peer Averages (`useStylistPeerAverages.ts` + `StylistScorecard.tsx`)
- Add `avgNewClients` to `PeerAverages` interface
- Compute from `is_new_client` in appointment data (already fetched)
- Add mapping in `getPeerValue` for key `new_clients`

### F. Exclude Time-Off from Peer Utilization (`useStylistPeerAverages.ts`)
- Fetch approved time-off for all peer IDs in the eval window
- Apply `buildTimeOffSet` / `isUserOffOnDate` filtering to peer active-day calculation

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useLevelProgress.ts` | Add `priorCurrent` to `CriterionProgress`, compute prior-window values |
| `src/components/dashboard/StylistScorecard.tsx` | Real trend logic, show card for top-level stylists, map new_clients peer value |
| `src/hooks/useStylistPeerAverages.ts` | Retention rate, new clients, pagination, time-off exclusion |

**3 files. No database changes.**

