

## Prompt feedback
Solid prompt — you named the symptom ("cards say walk-in but aren't walk-ins") and the desired fix path ("wire from Phorest properly"). Sharper next time: name the surface ("the day-view schedule cards on /dashboard/schedule") and whether you've seen this happen for new bookings, old bookings, or both — that distinction maps to two different sync gaps. Also useful: state whether the underlying Phorest client *actually has a name in Phorest* (you can verify by clicking through to the client in Phorest), so we know whether to fix our sync vs flag a Phorest data quality issue. The screenshot is great evidence — pair it with one or two specific appointments next time so we can trace them end-to-end without database queries.

## What's broken

Concrete reconnaissance against your live database:

- **445 of 1,656 recent appointments (27%)** render as "Walk-in" on the schedule despite having a `phorest_client_id`
- Of those 445:
  - **356 (80%)**: the `phorest_client_id` references a client that has **no row in `phorest_clients` at all** — these are real clients with bookings, but the client sync never persisted them
  - **89 (20%)**: have a matched client row that *does* have a name (`pc.name`, `first_name`, `last_name`) and *do* resolve correctly through `v_all_appointments`. These are NOT broken.

So the actual bug is **356 appointments with valid Phorest client IDs but no synced client record**. The view-level COALESCE chain can't help — it has no row to read from.

Tracing the cause to `supabase/functions/sync-phorest-data/index.ts`:

**Line 530 (appointment sync):**
```ts
client_name: apt.clientName || `${apt.client?.firstName || ''} ${apt.client?.lastName || ''}`.trim() || null,
```
The Phorest appointment endpoint returns `clientId` but not `clientName` (the embedded `client` object is sparse or absent). So `client_name` is written as `NULL` for nearly every appointment at sync time.

**Lines 560-602 (post-sync name backfill):**
This block tries to recover by reading `phorest_clients` and patching `client_name`. But it only works *if the client already exists in `phorest_clients`* — and the 356 missing ones don't.

**Lines 605-614 (walk-in tagging):**
```ts
.update({ is_walk_in: true })
.is('phorest_client_id', null)
```
This correctly marks *true* walk-ins (no client ID at all). It does NOT mistakenly tag the 356 — they keep `is_walk_in = false`. The cards just visually look like walk-ins because the rendering fallback is `appointment.client_name || 'Walk-in'`.

**The structural gap:** the sync flow assumes every appointment's referenced client has already been synced through `syncClients`. But:
- `syncClients` paginates Phorest's client list (newest-first or by index) and may stop before reaching every referenced client
- New clients booked between client syncs reference IDs that don't exist locally yet
- The post-sync backfill only patches what's already in `phorest_clients` — it never *fetches* the missing client from Phorest

## The fix — three layers, ordered by impact

### 1. (Highest impact) On-demand client fetch during appointment sync

Modify the post-sync backfill block (lines 560-602 of `sync-phorest-data/index.ts`):

- After resolving names from local `phorest_clients`, identify the residual set of `phorest_client_id`s that *still* have no name (the 356 case)
- For each unresolved ID, call Phorest's `GET /business/{businessId}/branch/{branchId}/client/{clientId}` endpoint directly
- Upsert the response into `phorest_clients` (so future appointments and the COALESCE chain pick it up)
- Update the appointment's `client_name` from the freshly fetched name

Constraints:
- **Concurrency cap**: process in batches of ~5 parallel requests (Phorest rate limits are tight; current scrape patterns suggest 5 concurrent is safe)
- **Per-run cap**: max 200 on-demand fetches per sync run, so a sudden surge doesn't exhaust the rate budget for the rest of the sync
- **Negative cache**: if a client fetch returns 404 (deleted in Phorest), write a placeholder row (`name = '[Deleted Client]'`, `phorest_client_id` set, `notes` flagged) so we don't keep retrying every 15 minutes
- **Graceful degradation**: any fetch error logs but does not fail the sync run — appointment names just stay null until next attempt

### 2. (Medium impact) Render fallback for "has client ID, no name yet"

In `src/components/dashboard/schedule/AppointmentCardContent.tsx` (line 313-315) and the compact-name helper (line 38), distinguish three states:

| State | Today | After |
|---|---|---|
| `client_name` present | Renders the name | unchanged |
| `client_name` null AND `phorest_client_id` null AND `is_walk_in = true` | "Walk-in" | "Walk-in" (correct) |
| `client_name` null AND `phorest_client_id` present | "Walk-in" (wrong) | "Loading…" with a small spinner icon, OR a short ID-derived placeholder like "Client #ABC1" using last 4 chars of the Phorest ID |

This is purely cosmetic but it stops mislabeling 356 appointments as walk-ins until the sync catches up. The "Loading…" treatment also signals to the operator "we know there's a client here, the name just hasn't synced yet" — which is the truthful answer.

Same fallback applied to `src/components/dock/appointment/DockSummaryTab.tsx` (line 51), `src/components/dock/schedule/DockAppointmentCard.tsx` (line 193), and `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` (line 800).

### 3. (Long-tail) One-time backfill migration for the existing 356

A focused edge function (or one-shot SQL through the migration tool) that:
- Selects all `phorest_appointments` rows with `client_name IS NULL` and `phorest_client_id IS NOT NULL` and no matching `phorest_clients` row
- Calls the on-demand fetcher (same code path as fix #1) to populate `phorest_clients` and patch `client_name`
- Run it once to clear the existing backlog; future drift is handled by fix #1

Triggered from `/dashboard/admin/integrations` as a one-click "Reconcile missing client names" button so it's user-initiated, not buried in cron.

## Files involved

**Modified:**
- `supabase/functions/sync-phorest-data/index.ts` — extend the post-sync backfill (lines 560-618) with on-demand client fetch + negative cache; add a small Phorest client-fetch helper
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — three-state render fallback in `formatCompactName` and the inline name span (lines 38, 315)
- `src/components/dock/appointment/DockSummaryTab.tsx` — same three-state fallback
- `src/components/dock/schedule/DockAppointmentCard.tsx` — same
- `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — same
- `src/lib/appointment-display.ts` — **new** helper `getDisplayClientName(appointment)` returning `{ label, isResolved, isWalkIn }` so the three-state logic is centralized; all four render sites import this instead of inlining `client_name || 'Walk-in'`

**New:**
- `supabase/functions/reconcile-phorest-client-names/index.ts` — one-shot reconciliation function for the existing backlog
- `src/components/dashboard/admin/integrations/ReconcileClientNamesButton.tsx` — admin trigger UI

**Untouched (intentionally):**
- `v_all_appointments` view — its COALESCE is correct; the bug is upstream of it
- `phorest_clients` table schema — no changes needed
- `is_walk_in` column logic — already correct, just visually conflated with the null-name case

## What stays the same

- `client_name || 'Walk-in'` semantics for *true* walk-ins (`phorest_client_id IS NULL`) — unchanged
- All read paths through `v_all_appointments` — unchanged
- Phorest sync cadence (every 15 minutes) — unchanged
- POS-First doctrine: Phorest is still the source of truth for client identity; we're just syncing it more completely

## QA checklist

- Run `sync-phorest-data` once → confirm log line shows new "On-demand fetched N missing clients" entry and the `pc.phorest_client_id` count grows
- Re-query: `SELECT COUNT(*) FROM phorest_appointments pa LEFT JOIN phorest_clients pc ON pc.phorest_client_id = pa.phorest_client_id WHERE pa.client_name IS NULL AND pa.phorest_client_id IS NOT NULL AND pc.phorest_client_id IS NULL AND pa.appointment_date >= CURRENT_DATE - INTERVAL '30 days'` → drops from 356 → near-zero after reconciliation function runs
- Open `/dashboard/schedule` → cards previously showing "Walk-in" now show real names
- Cards with truly null `phorest_client_id` (`is_walk_in = true`) still show "Walk-in" with the existing badge
- Appointments mid-flight (synced this minute, client fetch pending) show "Loading…" rather than "Walk-in"
- Phorest 404 on client fetch → row written as "[Deleted Client]"; on next sync, no retry storm
- Rate-limit safety: simulate a sync where 500 client IDs are missing → only 200 fetched per run, remainder picked up next run

## Follow-ups (separate scope)

1. **Move client fetch into appointment sync directly** instead of as a post-sync pass — would eliminate the two-pass pattern entirely. Worth it once we trust the rate limits.
2. **Webhook subscription** for Phorest client created/updated events (if available) — push model beats poll model for the freshness gap.
3. **Visibility lever**: surface "X% of appointments missing client names" as an integration health metric on the Operations Hub so future regressions are noticed in days, not months.

## Enhancement suggestion

The reason this bug shipped is the same shape as the utilization clamp from earlier today: a UI fallback (`|| 'Walk-in'`) **swallowed a data-quality signal** instead of surfacing it. "Client ID present, name missing" is meaningful information — it tells operators their integration is drifting. We rendered it as if it were the same as a true walk-in, hiding the drift. Worth one short canon entry: **"Fallback values must be distinguishable from real values when the underlying state differs."** Examples this would catch in advance: `client_name || 'Walk-in'` (this bug), `utilization > 100 ? 100 : utilization` (the clamp), `staff_name || 'Unassigned'` (similar pattern in payroll). The pattern is "default-on-null is fine when null and the default mean the same thing; otherwise you're erasing a signal." Same shape as the alert-fatigue and signal-preservation doctrines — naming it once gives us one more lens to catch this class before it ships.

