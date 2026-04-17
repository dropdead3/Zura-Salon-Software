

## Prompt review

Sharp, focused prompt — you named the exact card and the exact problem. Better than "schedule loads slowly." One enhancement: include **what date range you're on when it's slow**. The `today` view fans out fewer queries than `30d`/`ytd`. Knowing the range lets me tell you whether to fix the slowest range first (high leverage) or the most-used range (high frequency).

For next time: "Sales Overview is slow on `today` view, ~3s before numbers appear" gives a leverage marker.

## Wave 14: Sales Overview Performance — P0 Fix

**Doctrine anchor:** `high-concurrency-scalability` + `analytics-intelligence-and-data-integrity-standards`

### What I found

The `AggregateSalesCard` fans out **~12 parallel hooks** on mount. Bottlenecks:

| # | Finding | Priority |
|---|---|---|
| 1 | `useSalesMetrics` and `useSalesComparison` **each** paginate the full `v_all_transaction_items` table for the date range — duplicated scans of the same data | **P0** |
| 2 | `useSalesMetrics`, `useSalesByStylist`, `useSalesByLocation`, `useSalesTrend` have **no `staleTime`** → every remount/navigation refetches everything | **P0** |
| 3 | `useSalesByStylist` does **3 sequential queries** (staff mappings → resolveStaffNames → photos) before the main scan — serial waterfall | **P1** |
| 4 | `useSalesComparison` paginates **two full periods** sequentially via `Promise.all` but each is a paginated loop — doubles the slowest query | **P1** |
| 5 | `useSalesByLocation` scans `v_all_appointments` separately even though `useSalesMetrics` already pulls the same rows | **P2** (dedup opportunity) |

### Recommended fix (P0 only — Wave 14)

**Fix #1 — Add `staleTime` to all 4 main Sales Overview queries:**
- `useSalesMetrics`: `60_000` (1m) — heaviest query, most reused
- `useSalesByStylist`: `60_000` (1m)
- `useSalesByLocation`: `60_000` (1m)
- `useSalesTrend`: `5 * 60_000` (5m) — trend lines change slowly
- `useSalesComparison`: `5 * 60_000` (5m) — historical comparison rarely changes
- `useServiceMix`: `5 * 60_000` (5m) — already has `enabled` guard

This **alone** cuts perceived load to ~0ms on dashboard remount, tab switch, and date-range toggles within the stale window.

**Fix #2 — Defer comparison + trend until needed:**
- `useSalesComparison` is only used for **trend arrows** in KPIs. Add `staleTime` (above) — no need to defer.
- `useSalesTrend` only feeds sparkline/location-trend rendering. Already not blocking.

**Fix #3 — Skip the duplicate `useSalesByLocation` query when a single location is selected:**
- When `filterContext?.locationId` is set and not `'all'`, the location table is hidden. Pass `enabled: isAllLocations` to skip the query entirely on single-location dashboards.

### Acceptance checks

1. All 5 hooks (`useSalesMetrics`, `useSalesByStylist`, `useSalesByLocation`, `useSalesTrend`, `useSalesComparison`) have explicit `staleTime` values
2. `useSalesByLocation` is `enabled: false` when a single location is selected
3. No production behavior changes — caching and conditional fetching only
4. `npm test` still 111/111
5. Subjective: dashboard remount on `today` should feel instant after first load
6. Logged in `DEBUG_LOG.md` with doctrine anchor + leverage marker

### Files to modify

- `src/hooks/useSalesData.ts` — add `staleTime` to 4 hooks; add `enabled` flag to `useSalesByLocation`
- `src/hooks/useSalesComparison.ts` — add `staleTime`
- `src/components/dashboard/AggregateSalesCard.tsx` — pass `enabled` flag to `useSalesByLocation` based on `isAllLocations`
- `DEBUG_LOG.md` — Wave 14 findings + ranked register

### Deferred (carried forward with trigger conditions)

- **P1 #3** (`useSalesByStylist` 3-query waterfall) — **trigger: Wave 15 multi-axis audit OR if stylist leaderboard load remains the slowest segment after staleTime fix**
- **P1 #4** (`useSalesComparison` sequential pagination) — **trigger: Wave 15 OR if comparison query dominates after caching**
- **P2 #5** (dedup `useSalesByLocation` against `useSalesMetrics`) — **trigger: requires hook refactor + shared cache layer; defer until 3rd duplicate scan identified**
- **P1: Tooltip ref warning in `SupplyLibraryTab.tsx:94`** — **trigger: next color-bar work**
- ESLint taxonomy rule — **trigger: 3rd domain adopts the bus**
- `VisibilityContractAuditPanel` UI — **trigger: ≥1 non-color-bar adopter**
- CI audit-comment grep — **trigger: 3rd undocumented audit query**
- Multi-axis audit pass — **trigger: Wave 15** (one wave away)

