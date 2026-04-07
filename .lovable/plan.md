

# Scale-Proofing: Polling, Pagination, Indexes, and Realtime Consolidation

## Overview

Four workstreams to prevent performance degradation as the platform scales to hundreds of organizations. No cost increase — these are architectural optimizations that *reduce* database load.

---

## Phase 1: Replace High-Frequency Polling with Realtime (Biggest Impact)

**Problem**: 29 hooks use `refetchInterval` (30s-60s). At 200 orgs with 5 concurrent admins each = 1,000 users. A 30s poll across 10 hooks = ~20,000 queries/minute hitting the database for no reason when data hasn't changed.

**Fix**: For hooks that already have realtime subscriptions, remove `refetchInterval` entirely — the subscription handles updates. For high-traffic hooks without subscriptions, add a realtime listener and remove the poll.

| Hook | Current | Change |
|------|---------|--------|
| `useMentions` | Realtime + 30s poll | Remove poll |
| `useUnreadMentionCount` | 30s poll only | Add realtime, remove poll |
| `useUnreadAnnouncements` | 30s poll only | Add realtime, remove poll |
| `useUnreadAnnouncementCount` | 30s poll only | Add realtime, remove poll |
| `useLeadInbox` (both queries) | 30s poll only | Add realtime on `salon_inquiries`, remove poll |
| `useOrganizationStats` | 30s poll only | Increase to 5min (platform admin, low traffic) |
| `useOnboardingOrganizations` | 30s poll only | Increase to 5min |
| `useOrganizationHealthScores` | 60s poll only | Increase to 5min |
| `usePlatformAuditLog` | 60s poll only | Increase to 5min |
| `useEdgeFunctionLogs` (2 queries) | 30s poll only | Increase to 2min |
| `useSystemHealth` | 60s poll only | Increase to 5min |
| `usePandaDocStats` | 30s poll only | Increase to 5min |
| `useStripePaymentsHealth` | 60s poll, has realtime | Remove poll |
| `useBenchmarkData` | 60s poll | Remove (data changes daily, not per-minute) |
| `useColorBarStations` | 30s poll | Add realtime, remove poll |
| `useKioskSettings` | 60s poll | Remove (settings don't change per-minute) |
| `useServiceEmailFlows` | 60s poll | Remove (config data) |

**Hooks to leave as-is** (legitimately need frequent refresh):
- `useTimeClock` (60s — live elapsed timer)
- `useTodaysQueue` (30s — but already has realtime, so remove poll)
- `useLiveSessionSnapshot` (60s — active session data)
- `useAdjustedExpectedRevenue` (60s — live revenue tracking)
- `useTodayActualRevenue` (5min — reasonable)
- `useDockAppointments` / `useDockMixSessions` (active stylist session)

**Files**: ~20 hook files modified (1-3 lines each — remove or increase `refetchInterval`, add realtime subscription where noted)

---

## Phase 2: Add Database Indexes for Scale-Critical Queries

**Problem**: As tables grow to 100K+ rows, unindexed queries on `organization_id + status` combinations will degrade from milliseconds to seconds.

**Migration SQL** (single migration):

```sql
-- employee_profiles: used by useOrganizationUsers, useOrganizationStats
CREATE INDEX IF NOT EXISTS idx_employee_profiles_org_active 
  ON employee_profiles(organization_id, is_active);

-- locations: used by useOnboardingOrganizations, useOrganizationStats
CREATE INDEX IF NOT EXISTS idx_locations_org_active 
  ON locations(organization_id, is_active);

-- organizations: used by platform admin queries
CREATE INDEX IF NOT EXISTS idx_organizations_status 
  ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding_stage 
  ON organizations(onboarding_stage);

-- salon_inquiries: used by useLeadInbox
CREATE INDEX IF NOT EXISTS idx_salon_inquiries_status_created 
  ON salon_inquiries(status, created_at DESC);

-- user_mentions: used by useMentions, useUnreadMentionCount
CREATE INDEX IF NOT EXISTS idx_user_mentions_user_read 
  ON user_mentions(user_id, read_at);

-- organization_health_scores: used by useOrganizationHealthScores
CREATE INDEX IF NOT EXISTS idx_health_scores_org_date 
  ON organization_health_scores(organization_id, score_date DESC);

-- import_jobs: used by useOrganizationStats, useSystemHealth
CREATE INDEX IF NOT EXISTS idx_import_jobs_status 
  ON import_jobs(status);

-- edge_function_logs: used by useSystemHealth
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_status_started 
  ON edge_function_logs(status, started_at DESC);

-- user_roles: used by useOrganizationUsers
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON user_roles(user_id);
```

**Files**: 1 database migration

---

## Phase 3: Paginate Platform Admin Queries

**Problem**: `useOrganizationsByStatus`, `useOnboardingOrganizations`, and `useOrganizationHealthScores` fetch ALL rows with `select('*')`. At 500+ organizations, these will hit the 1,000-row Supabase limit and silently return incomplete data.

**Fix**: Add `.limit()` and pagination support to platform admin list queries.

- `useOrganizationsByStatus` — add `page` param, `.range(offset, offset + pageSize - 1)`, return `{ data, totalCount }`
- `useOnboardingOrganizations` — add `.limit(100)` (onboarding orgs are always a subset)
- `useOrganizationHealthScores` — deduplicate server-side using a DB view or `DISTINCT ON` instead of fetching all rows and filtering in JS
- `useLeadInbox` — add `.limit(100)` (already ordered by `created_at DESC`)

**Files**: 4 hook files modified

---

## Phase 4: Consolidate Realtime Channels

**Problem**: 16 separate channels across the app. Each user opens multiple WebSocket subscriptions. At scale, this strains Supabase's connection pool.

**Fix**: Merge related channels per context:

| New Channel | Replaces |
|------------|----------|
| `org-activity-{orgId}` | `bell_high_fives`, `ring_the_bell`, `queue-updates`, `sales-realtime`, `stylist-levels-realtime` |
| `user-personal-{userId}` | `user-mentions`, `smart-actions-{userId}`, `user-notifications-realtime` |
| `chat-{channelId}` | Keep as-is (already scoped) |
| `platform-admin` | `platform-incidents-realtime`, `stripe-health-realtime`, `announcements-realtime` |

This reduces channels per user from ~8-10 to ~3-4.

**Files**: ~10 files modified (subscription setup consolidated into shared hooks)

---

## Execution Order

1. **Phase 2** (indexes) — zero risk, immediate query speedup, 1 migration
2. **Phase 1** (polling → realtime) — biggest load reduction, ~20 small file edits
3. **Phase 3** (pagination) — prevents data correctness issues at scale, 4 files
4. **Phase 4** (channel consolidation) — most complex refactor, defer if time-constrained

## Scope
- ~25 hook files modified
- 1 database migration (indexes)
- No breaking changes to UI or data flow
- No new dependencies

