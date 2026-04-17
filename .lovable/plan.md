

## Prompt review

Strong direction — you're naming three distinct enhancement vectors (analytics, UX polish, performance) rather than lumping them as "improvements." That makes scoping trivial and lets each one stand or fall on its own merit. The framing also shows good doctrinal alignment: the audit log feeds *network intelligence*, the rolled-up toast honors *calm UX*, and the prefetched status honors *instant feedback*.

Tighter framing for next time: prefix each enhancement with its **doctrinal anchor** (e.g., "Network Intelligence:", "Calm UX:", "Performance:"). It signals to the engineer *why* the work matters, not just *what* it does — and it surfaces priority conflicts early.

## Plan — Wave 3

### 1. Suspension audit log (Network Intelligence)

**New table:** `color_bar_suspension_events`
- `id` uuid pk
- `organization_id` uuid not null (FK + RLS scope)
- `event_type` enum: `'suspended' | 'reactivated'`
- `reason` text nullable (only on `suspended`)
- `notes` text nullable
- `actor_user_id` uuid (auth.users)
- `affected_location_count` int
- `created_at` timestamptz default now()

RLS: org admins read their own; platform users read all.

**Wire-up in `useColorBarToggle.ts`:**
- After `softDisable` succeeds → insert `suspended` event with reason/notes/actor
- After `reactivate` succeeds → insert `reactivated` event with location count

**Why a separate table** (not just keeping reason on the entitlement): supports churn-pattern queries across the network without losing history when a row is reactivated and re-suspended later. Feeds future Industry Intelligence aggregations.

### 2. Rolled-up reactivation receipt (Calm UX)

In `InventoryReconciliationBanner.tsx` org-level view (the per-location list with "Mark verified" buttons):

- Add `useMarkAllInventoryVerified` mutation that loops over flagged locations in one batch
- Replace per-location toasts with a single rolled-up toast:
  - 1 location: *"Drop Dead - North Mesa verified — Color Bar restored"*
  - 2+ locations: *"3 locations verified — Color Bar fully restored"*
- Suppress the individual `toast.success` from `useMarkInventoryVerified` when invoked via the batch path (pass a `silent: true` flag)
- Add a "Verify all" button at the top of the per-location list when 2+ locations are flagged

### 3. `useReactivationStatus(orgId)` (Performance)

**New hook:** `src/hooks/color-bar/useReactivationStatus.ts`

Returns:
```ts
{
  wasPreviouslySuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  suspendedLocationCount: number;
  affectedLocationNames: string[];
  isLoading: boolean;
}
```

Query keyed by `['color-bar-reactivation-status', orgId]`, 30s staleTime, prefetched on hover/focus of the toggle row in `ColorBarEntitlementsTab` and `AccountAppsCard`.

Refactor `toggleColorBar` and `AccountAppsCard.handleToggle` to read from this hook instead of doing inline `select()` queries → dialog opens instantly on click.

## Acceptance checks

1. Toggling off writes a `suspended` row to `color_bar_suspension_events` with reason + actor
2. Confirming reactivation writes a `reactivated` row with affected location count
3. RLS verified: org admins see only their own org's events; platform users see all
4. Org-level banner shows "Verify all" button when 2+ flagged
5. Clicking "Verify all" produces a single rolled-up toast, not N toasts
6. Hovering the toggle row prefetches reactivation status
7. Clicking the toggle on a previously-suspended org opens the dialog with no visible network delay
8. No regression to single-location "Mark verified" flow
9. `inventory_drift` remains visible during reconciliation (Wave 2 fix preserved)
10. Suspension/reactivation events visible in a future audit query (no UI required this wave)

## Files to modify / create

**Migration:**
- `color_bar_suspension_events` table + enum + RLS + indexes

**Hooks (new):**
- `src/hooks/color-bar/useReactivationStatus.ts`
- `src/hooks/color-bar/useMarkAllInventoryVerified.ts`

**Hooks (modify):**
- `src/hooks/color-bar/useColorBarToggle.ts` — write audit events on suspend/reactivate; consume `useReactivationStatus`
- `src/hooks/color-bar/useMarkInventoryVerified.ts` — accept `silent` flag

**UI (modify):**
- `src/components/dashboard/color-bar/InventoryReconciliationBanner.tsx` — "Verify all" button + rolled-up toast
- `src/components/platform/color-bar/ColorBarEntitlementsTab.tsx` — prefetch on hover; consume new hook
- `src/components/platform/account/AccountAppsCard.tsx` — same prefetch + hook consumption

## Deferred (not in this wave)

- Audit *viewer* UI (table of suspension events) — separate platform admin page
- Cross-org churn analytics dashboard — needs ≥10 events to be meaningful

