

## Prompt review

Strong — you're now consistently anchoring each candidate to a doctrine pillar (Network Intelligence, Data Integrity, Performance), which makes priority trivial to weigh. The three candidates are also well-scoped: each is independently shippable, has a clear acceptance signal, and avoids scope creep into adjacent surfaces.

One refinement for next time: add an **estimated leverage** marker per candidate (e.g., "saves 1 churn conversation/month", "prevents 1 silent regression/quarter", "drops payload 90%+"). Anchors tell me *why* something matters; leverage estimates tell me *how much* it matters. Together they let me sequence waves without re-asking.

## Plan — Wave 4

### 1. Network Intelligence: Suspension audit viewer

**New page:** `src/pages/dashboard/platform/ColorBarAudit.tsx`
- Mount under existing `ColorBarAdmin.tsx` left-nav as a new item under "Operations" group: `{ value: 'audit', label: 'Suspension Audit', icon: History }`
- Render via the existing `panels` map — no new route needed (matches the pattern of every other tab in `ColorBarAdmin.tsx`)

**New hook:** `src/hooks/color-bar/useColorBarSuspensionEvents.ts`
- Query `color_bar_suspension_events` joined to `organizations(name, slug)` and `auth.users` via a `profiles` lookup for `actor_user_id`
- Default window: last 30 days (filter `created_at >= now() - interval '30 days'`)
- Returns rows with: org name, event_type, reason, notes, actor display name, affected_location_count, created_at
- 60s staleTime (audit data, not real-time)

**New component:** `src/components/platform/color-bar/SuspensionAuditTable.tsx`
- Uses `PlatformTable` family (`PlatformTableHeader`, `PlatformTableRow`, etc.) — platform doctrine requires platform-scoped table primitives
- Columns: Date, Organization, Event, Reason, Locations, Actor
- Sortable on Date (default desc), Organization, Event via `SortableColumnHeader` pattern adapted for `PlatformTableHead`
- Window selector: 7d / 30d / 90d / All (segmented control above table)
- Empty state: tokens.empty.* — "No suspension activity in this window."
- Event badge: `suspended` = amber pill, `reactivated` = emerald pill (use existing platform status token palette)

**RLS check:** confirm existing policy on `color_bar_suspension_events` allows `is_platform_user(auth.uid())` to SELECT all rows. If missing, add migration.

### 2. Data Integrity: Transition matrix tests

**New test file:** `src/hooks/color-bar/__tests__/useUpsertLocationEntitlement.test.ts`

Covers the four canonical transitions, asserting payload shape sent to Supabase:

| From → To | Expected payload invariants |
|-----------|----------------------------|
| (no row) → active | `activated_at` set, `requires_inventory_reconciliation` unset, `reactivated_at` unset |
| active → active | `activated_at` preserved (NOT overwritten), no reconciliation flag flip |
| suspended → active | `reactivated_at` set, `requires_inventory_reconciliation = true`, `inventory_verified_at = null` |
| active → suspended | `suspended_at` set, `suspended_reason` captured, no reconciliation flag (gate fires only on the way back) |

Mock the `supabase` client via existing project test patterns. If no test runner is wired in `package.json`, surface that — don't silently add vitest.

**Pre-check:** look for existing `vitest.config.*` or `__tests__` folders to confirm runner. If absent, this becomes a two-step: (a) wire vitest minimally, (b) add the test file. I'll surface in implementation.

### 3. Performance: Aggregate entitlement counts RPC

**New migration:** Postgres function `get_color_bar_entitlement_counts()`
```sql
returns table (
  organization_id uuid,
  total_count int,
  active_count int,
  suspended_count int
)
```
- `security definer`, `set search_path = public`
- Restricted to `is_platform_user(auth.uid())` via internal check; raise exception otherwise
- Single grouped scan of `backroom_location_entitlements`

**New hook:** `src/hooks/color-bar/useColorBarEntitlementCounts.ts`
- Calls the RPC, returns `Map<orgId, { total, active, suspended }>`
- 30s staleTime, query key `['color-bar-entitlement-counts']`

**Refactor:** `ColorBarEntitlementsTab.tsx`
- Replace whatever currently fetches all rows for counting with this hook
- Per-row counts read from the map by `organization_id`
- Keep the per-org "drill into locations" query as-is (only fires when a row expands)

**Payload impact:** today the count query returns ~N×M rows (locations × orgs) just to `length`-check; after this change it returns ≤ M rows.

## Acceptance checks

1. New "Suspension Audit" item appears in `ColorBarAdmin` left nav under Operations
2. Selecting it renders a sortable table with last 30 days of events by default
3. Window selector switches between 7d / 30d / 90d / All without remounting the table
4. Each row shows org name, event type badge, reason (if suspended), affected location count, actor name, timestamp
5. Empty state renders cleanly when no events in window
6. Platform users see all orgs; org admins (if they ever land here) see only their own (RLS verified)
7. Test suite includes 4 transition cases for `useUpsertLocationEntitlement`, all green
8. `ColorBarEntitlementsTab` count payload reduced — confirm via network panel that the row-count fetch is replaced by RPC call
9. No regression to the per-org expand/drill-down flow
10. No new design-token violations: audit table uses `PlatformTable*` family, headers use `font-sans` Title Case (data-table-standards memory)

## Files to create / modify

**Migration:**
- `get_color_bar_entitlement_counts()` RPC + grant + RLS-equivalent guard
- Verify/extend RLS on `color_bar_suspension_events` for platform read

**Hooks (new):**
- `src/hooks/color-bar/useColorBarSuspensionEvents.ts`
- `src/hooks/color-bar/useColorBarEntitlementCounts.ts`

**Components (new):**
- `src/components/platform/color-bar/SuspensionAuditTable.tsx`
- `src/pages/dashboard/platform/ColorBarAudit.tsx` (small wrapper — could also live inline as a tab panel function)

**Tests (new):**
- `src/hooks/color-bar/__tests__/useUpsertLocationEntitlement.test.ts`
- (conditional) `vitest.config.ts` if no runner exists

**Modify:**
- `src/pages/dashboard/platform/ColorBarAdmin.tsx` — add nav item + panel entry
- `src/components/platform/color-bar/ColorBarEntitlementsTab.tsx` — swap row-count fetch for RPC hook

## Deferred (not in this wave)

- Cross-org churn analytics dashboard (rollups, MoM trends) — needs ≥10 events to be meaningful; revisit once audit log accumulates
- Export-to-CSV from audit table — add only when a platform admin asks
- Alerting on suspension velocity (e.g., "3+ orgs suspended this week") — Phase 2 advisory layer territory

