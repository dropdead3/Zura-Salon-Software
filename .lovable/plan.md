

## Prompt review

Good prompt — you named the exact page and a clear symptom ("loads too slow", "make it instant"). Two enhancements for next time:

- **Cold vs warm**: is it slow on first visit only, or also when you click the sidebar Settings link from another dashboard page? They have different fixes.
- **What "slow" looks like**: cards appear but feel laggy? Whole page blank for ~2s? Skeleton flicker? Each maps to a different bottleneck (route bundle, layout queries, render cost).

For next time: *"Settings takes ~2s of blank screen before any cards appear, both on first visit and when navigating to it"* gives a leverage marker.

## Plan — Wave 17: Settings Page Cold-Load Performance (P0)

**Doctrine anchor:** `high-concurrency-scalability`

### What I found

The Settings grid itself is cheap — it's just static cards. The slowness is **not in Settings**, it's in `DashboardLayout` (sidebar/topbar) firing a fan-out of unscoped, uncached queries on every dashboard route mount. Settings just *feels* the worst because it has almost no content of its own to mask the layout cost.

| # | Finding | Where | Priority |
|---|---|---|---|
| 1 | `useEmployeeProfile`, `useTeamDirectory`, `useProfileCompletion`, `useOnboardingProgress`, `useBusinessSettings` have **no `staleTime`** → every dashboard route refetches them | `DashboardLayout` | **P0** |
| 2 | A single huge `v_all_staff?phorest_staff_id=in.(32+ ids)` request fires on every page (phorest staff resolution) | layout / topbar | **P0** |
| 3 | `useTeamDirectory` pulls **the entire active employee roster** (all fields, all rows) for the topbar avatar list — hundreds of rows, fired on every route | layout | **P0** |
| 4 | `Settings.tsx` renders ~30 `MetricInfoTooltip` instances eagerly; each one mounts a Radix Tooltip + triggers a ref-warning render path | Settings grid | **P1** |
| 5 | `SettingsCategoryDetail` is lazy-loaded (good) but its **module's top-level imports** include heavy hooks (`useBusinessCapacity`, `useStaffingAlertSettings`, `useServicesWithFlowsCount`, `useInfotainerSettings`, `useOrgSecuritySettings`, `useAutoSyncTerminalSplash`, etc.). When a category is opened, all of those run even for unrelated categories. | detail view | **P1** (deferred) |
| 6 | Sidebar/topbar fires `changelog_entries`, `payroll_connections`, `headshot_requests`, `announcements`, `unread_announcements` on every mount with no caching | layout | **P1** |

Note finding #5 only hurts after a category is clicked, not the grid itself, so it's deferred.

### Implementation plan (P0 only — Wave 17)

**Fix #1 — Cache layout-level queries aggressively:**
Add `staleTime` to the always-on dashboard hooks so subsequent route mounts are instant:

- `useEmployeeProfile`: `5 * 60_000` (5m)
- `useTeamDirectory`: `5 * 60_000` (5m)
- `useBusinessSettings`: `5 * 60_000` (5m)
- `useProfileCompletion`: `60_000` (1m)
- `useOnboardingProgress`: `60_000` (1m)
- `useUnreadAnnouncements`: already `30s` — bump to `60_000`

**Fix #2 — Narrow `useTeamDirectory` for the topbar:**
The topbar avatar dropdown only needs `user_id`, `full_name`, `display_name`, `photo_url`. The current query already selects roughly those columns, but it pulls **every active employee** every route. Add an explicit `select` minimal column set (already mostly done) and a `5 * 60_000` `staleTime`.

**Fix #3 — Cache the phorest staff resolution:**
Find the hook that calls `v_all_staff?phorest_staff_id=in.(...)` from the layout/topbar (likely `useResolveStaffNames` or similar) and apply `staleTime: 5 * 60_000`. The phorest mapping rarely changes within a session.

**Fix #4 — Reduce Settings grid render cost:**
- Wrap the entire grid in a single `<TooltipProvider>` (it likely is already via the global provider — confirm) and ensure each `MetricInfoTooltip` doesn't create its own provider.
- Either drop `MetricInfoTooltip` from each card (descriptions are mostly redundant with the label) OR fix the ref warning by forwarding refs in `MetricInfoTooltip`. The render path triggers React warnings on every card.

### Acceptance checks

1. Navigating between dashboard routes (Sales → Settings → Sales) does not refire `employee_profiles`, `business_settings`, `v_all_staff`, `team_directory` queries within the stale window
2. First visit to Settings still works correctly; second visit is effectively instant
3. No `MetricInfoTooltip` ref warnings in console from `StaticCard`
4. No behavioral regression to topbar, sidebar, or category detail views
5. Tests still 111/111
6. Logged in `DEBUG_LOG.md` with doctrine anchor + leverage marker

### Files likely touched

- `src/hooks/useEmployeeProfile.ts` — staleTime on profile + team directory
- `src/hooks/useBusinessSettings.ts` — staleTime
- `src/hooks/useProfileCompletion.ts` — staleTime
- `src/hooks/useOnboardingProgress.ts` — staleTime
- `src/hooks/useUnreadAnnouncements.ts` — bump staleTime
- `src/lib/staffNames.ts` or `src/hooks/useResolveStaffNames.ts` (or wherever `v_all_staff` IN-list lives) — staleTime
- `src/components/ui/MetricInfoTooltip.tsx` — `forwardRef` to silence warning
- `src/pages/dashboard/admin/Settings.tsx` — optionally drop tooltip per card
- `DEBUG_LOG.md` — Wave 17 findings + ranked register

### Deferred (with trigger conditions)

- **P1 #5** (heavy top-level imports inside `SettingsCategoryDetail`) — **trigger: if opening individual category pages still feels slow after Wave 17**; would split the file into per-category lazy chunks.
- **P1 #6** (`changelog_entries` / `payroll_connections` / `headshot_requests` cache) — **trigger: bundled into the next layout-perf wave**, low individual impact but cumulative.
- **P2** (review if `DashboardLayout` itself can defer non-visible widgets like `OnboardingProgress`, `ChaChingDetector`, `IncidentBanner` until after first paint) — **trigger: if cold-load remains slow after Wave 17 caching pass**.
- **Lovable Cloud compute** — if cold-load is still slow after caching, the database may be the bottleneck under load. Trigger: only after Wave 17 verifies caching alone isn't enough; would recommend upgrading the Cloud instance via Backend → Advanced settings → Upgrade instance.

