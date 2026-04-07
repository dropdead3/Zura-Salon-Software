

# Remaining Speed and Load-Time Fixes Before Scaling

## Issues Found

### 1. N+1 Query in `useUnreadMessages` (Critical)
`useUnreadMessages.ts` runs a **sequential loop** — one `SELECT COUNT(*)` per channel inside a `for` loop. A user in 10 channels = 10 sequential DB round-trips every 30 seconds. At scale this is devastating.

**Fix**: Replace the loop with a single RPC call or a batched query using `.in('channel_id', channelIds)` with a group-by approach, or create a database function that returns unread counts for all channels in one call.

### 2. `useUnreadMessages` Still Polling at 30s
This hook was missed in Phase 1. It polls every 30 seconds and should use a realtime listener on `chat_messages` instead.

**Fix**: Add a realtime subscription on `chat_messages` to invalidate the query, remove `refetchInterval`.

### 3. `useUserStatus` Polling at 60s
`useUserStatus.ts` polls every 60 seconds for online/offline status of team members. This should use Supabase Presence (already set up in `usePlatformPresence.ts`) instead of polling a table.

**Fix**: Increase to 5 min or replace with presence-based status.

### 4. `useQuickStats` Creates 4 Parallel Hook Waterfalls
`useQuickStats` calls `useAppointmentSummary`, `useSalesMetrics`, `useRebookingRate`, and its own `useQuery` — each firing independent queries. While parallel, each sub-hook may itself run multiple queries. At the dashboard level this means 6-8 DB calls just for the stats row.

**Fix**: Consolidate into a single `useQuery` with `Promise.all` to batch the 4 data fetches into one hook invocation, reducing React render cycles and query key overhead.

### 5. `useDockAppointments` and `useDockMixSessions` — Active Session Polling
These poll at 30-60s which is correct for active sessions, but they lack `enabled` guards when the dock is not visible. If the dock component is mounted but hidden, it still polls.

**Fix**: Add `enabled: isVisible` guards so these only poll when the dock tab is active.

### 6. Missing `staleTime` on Many Hooks
~30 hooks have no `staleTime` set (defaults to 0), meaning every component mount triggers a refetch even if data was fetched milliseconds ago. This causes duplicate requests on tab switches and navigation.

**Fix**: Add sensible `staleTime` defaults to hooks that fetch org-scoped config/settings data (e.g., `useKpiDefinitions`, `useSignaturePresets`, `useContractAdjustments`, `useLocationSchedules`). Config data should have `staleTime: 5 * 60_000` (5 min).

### 7. Global React Query Defaults
No global `staleTime` or `gcTime` is configured in the QueryClient. Setting a global `staleTime: 30_000` (30s) would immediately reduce redundant refetches across all ~230 hooks without touching each file.

**Fix**: Update the QueryClient instantiation to set `defaultOptions.queries.staleTime = 30_000`.

### 8. `select('*')` Over-fetching
262 files use `select('*')` — most fetch all columns when only 2-3 are needed. This increases payload size and transfer time. The highest-impact ones to fix are the frequently-called hooks on the dashboard home path.

**Fix**: For the top 10 most-called hooks (quick stats, tasks, profile, roles, locations), replace `select('*')` with explicit column lists.

## Priority Order

1. **N+1 in `useUnreadMessages`** — single biggest per-user query amplifier
2. **Global `staleTime` default** — one-line fix, reduces redundant fetches across 230 hooks
3. **`useUnreadMessages` polling → realtime** — removes 30s polling for all chat users
4. **`useUserStatus` polling reduction** — reduce from 60s to 5min
5. **`useQuickStats` consolidation** — reduce dashboard home query count
6. **`select('*')` → explicit columns** — top 10 hooks on critical path
7. **Dock `enabled` guards** — prevent background polling when dock is hidden
8. **Config hook `staleTime`** — add 5min staleTime to ~15 settings/config hooks

## Scope
- ~20 hook files modified (1-5 lines each for most)
- 1 QueryClient config change (1 line)
- 1 possible DB function for batched unread counts
- No breaking UI changes

