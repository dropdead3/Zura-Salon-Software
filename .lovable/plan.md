

## Prompt feedback
Sharp prompt — the screenshot is exactly the right evidence. Two of the cards (Annmarie X "Pure Brazilian Express Keratin" 2pm, Angelia Sanchez 3pm) actually have the correct names *in the database* now, but the schedule shows "Client #VBPQ" and a missing-name card. That's a different problem from the last three — it's a stale browser cache, not a sync gap. Sharper next time: a quick hard-reload before screenshotting separates "data wrong" from "view stale," and tells me whether to debug sync or render. Also — the API returning 404 for clients that *visibly exist in Phorest's web UI* is a Phorest quirk worth naming explicitly: their public app reads from a different endpoint than `GET /branch/{id}/client/{id}`, so a client appearing on a calendar in Phorest's UI does not guarantee the third-party client lookup will resolve them.

## Two distinct things going on (proven against the live DB and edge logs)

### Symptom A — "Client #VBPQ" and missing name where the data is actually correct

`gbilM7k7EIBBoqZ6OuVBPQ` (Annmarie X) and `k_YEpJ30Ib7uE8LwSb98pw` (Angelia Sanchez) are **fully resolved in the database**. Both `phorest_appointments.client_name` and `phorest_clients.name` hold the right names. The view returns the right names. The render layer renders whatever the query returns.

So why does the screenshot still show "Client #VBPQ" and a card with no name?

`usePhorestCalendar` queries `v_all_appointments` with `staleTime: 30_000` and a query key that **never invalidates on sync completion**. Once the user loaded the page before the backfill finished (sync ran at 06:05 UTC, 677 names backfilled), React Query holds the pre-backfill snapshot for 30 seconds + as long as the component stays mounted without a refetch trigger.

The user is looking at a stale snapshot. A hard reload would resolve it. The bug is that **the schedule has no observability into "sync just ran, your appointments now have names" — it just sits on the cached data**.

### Symptom B — "Client #EBKQ" / "Client #0H2A" / etc. — Phorest API returns 404 for clients that exist in Phorest's UI

`mQuniNJUV6CsoQ6QUUEbKQ` (Grant Carter), `PFZxTWB0tGY4sNu4pf0h2A` (Samantha Lyons), `HLVo8X1eGKPl6vka-HFj5g` (Kendra Harris) — the appointment exists, the client visibly exists in Phorest's calendar. But every call to `GET /branch/{branchId}/client/{clientId}` returns 404 from every branch in both regions. Edge logs prove it:

```
On-demand fetch PFZxTWB0tGY4sNu4pf0h2A: 404 from every branch; leaving unresolved
On-demand fetch [21 more IDs]: 404 from every branch; leaving unresolved
```

Two probable causes (not mutually exclusive):
1. **Phorest's `/branch/{id}/client/{id}` endpoint is permissioned differently from `/branch/{id}/client?searchableName=...`** — the third-party API may require a paginated list lookup, not a direct fetch. Phorest's docs are inconsistent on this.
2. **The calendar reads from a "global" client store** while `/branch/.../client/{id}` only resolves clients *owned* by that branch. A client booked across multiple branches may exist as one record in the calendar view but as separate per-branch records (or no record) in the third-party endpoint.

Either way, the on-demand single-client fetch path doesn't work for a chunk of real clients. We need a different lookup strategy.

### The third lurking issue — the database knows the appointment client name from Phorest's appointment payload

Looking at `phorest_appointments` for `mQuniNJUV6CsoQ6QUUEbKQ`: `client_name` is **NULL**. But Phorest's calendar clearly shows "Grant Carter" attached to that booking. So Phorest's appointment endpoint *does* know the client's name on the appointment level — we're just not capturing it. Line 530 of the sync function does:

```ts
client_name: apt.clientName || `${apt.client?.firstName || ''} ${apt.client?.lastName || ''}`.trim() || null,
```

If neither `apt.clientName` nor `apt.client.firstName/lastName` exists on the response shape, but Phorest's *calendar API* (the one their UI uses) returns the name as part of the appointment, we may be calling the wrong appointment endpoint or missing a query param like `include=client` or `expand=client`.

## The fix — three layers, in order

### 1. Verify what Phorest's appointment endpoint actually returns and capture the client name there

This is the **highest-leverage fix**. If the appointment-level response carries the client's name (as Phorest's UI suggests it does), we never need the per-client lookup at all — the map happens at sync time.

Reconnaissance steps:
- Add a one-time debug log in `syncAppointments` that dumps the raw shape of `apt` (including `apt.client`, any `firstName`/`lastName`/`name`/`email` fields) for the first 3 appointments per branch
- Check if Phorest's appointment endpoint accepts `?expand=client` or `?fields=client.firstName,client.lastName` — many Phorest API endpoints support field expansion
- If the appointment response has the name in *any* shape, broaden line 530 to read all candidate paths: `apt.clientName`, `apt.client?.firstName + lastName`, `apt.client?.name`, `apt.customer?.name`, `apt.customer?.firstName + lastName`

Once this is confirmed, the per-client fetch becomes a fallback for the rare appointment that doesn't carry client info inline — not the primary resolution path.

### 2. Replace per-client `/branch/{id}/client/{id}` with a paginated client search

For the residual clients the appointment payload doesn't resolve, switch the on-demand fetch from `GET /branch/{id}/client/{clientId}` to a paginated search that *does* work — typically `GET /branch/{id}/client?clientId={clientId}` or `GET /branch/{id}/client?size=200&page=N` filtered on our side.

The current per-client GET returns 404 for half the IDs. The list endpoint will return them all (it's how `syncClients` already works) — we just iterate larger pages or pass a filter.

Approach:
- Bundle all unresolved IDs from the current sync run
- Call the paginated client list per branch in the right region, page through until exhausted or all unresolved IDs are found
- Match by `phorest_client_id` and write the same upsert path

This trades "200 single-fetches" for "~5 paginated-list calls per branch" — strictly better for the rate budget AND works for clients the single-fetch endpoint can't see.

### 3. Add a sync-completion signal so the schedule refreshes when names land

The stale-cache bug (Annmarie X showing as "Client #VBPQ") is fixable in two ways:

**Option A (preferred)** — when `phorest-sync-status` query updates with a new `completed_at` for `appointments`, automatically `queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] })`. This already happens in some places via the sync status listener, but `usePhorestCalendar` doesn't subscribe to it. A small `useEffect` that watches `lastSync` (already in the hook at line 264-280) and calls `refetch()` when it advances would close the gap.

**Option B (fallback)** — drop `staleTime` from 30s to something like 60s for the appointment query but add a `refetchInterval: 60_000` so the schedule polls quietly while open. Higher network cost; less elegant.

Option A is cleaner and respects the no-polling doctrine in `tech-decisions/high-concurrency-scalability`.

## Files involved

**Investigated first (no edit until reconnaissance complete):**
- `supabase/functions/sync-phorest-data/index.ts` lines 480-530 — log the actual `apt` shape for 3 appointments to confirm what fields Phorest sends
- Phorest API docs (or a debug call from the function) for `/branch/{id}/appointment` to confirm whether `?expand=client` or similar is supported

**Likely modified:**
- `supabase/functions/sync-phorest-data/index.ts`:
  - Broaden line 530 to read all candidate name paths from the appointment response (low risk)
  - Add `?expand=client` (or whatever the docs require) to the appointment fetch URL
  - Replace the per-client GET in Pass 2 with a paginated client list lookup keyed on the unresolved IDs
- `src/hooks/usePhorestCalendar.ts` — add a `useEffect` watching `lastSync.completed_at` that triggers `refetch()` when it advances

**Migration:**
- One-shot SQL after fix #1 ships: clear `client_name = NULL` rows so the next sync re-resolves them through the corrected appointment-level extraction (idempotent, only touches rows still missing names)

**Untouched:**
- `src/lib/appointment-display.ts` — three-state contract is correct
- `v_all_appointments` view — COALESCE is correct
- The reconciliation function — same paginated-list fix applies, but ship the sync function fix first and validate before re-deploying reconciliation

## What stays the same

- `getDisplayClientName` three-state rendering
- "Client #ABCD" placeholder for genuinely-unresolvable IDs (correct behavior — we don't have the data, we shouldn't pretend we do)
- `is_walk_in` detection
- Region-aware iteration from yesterday's fix (still correct, just becomes less load-bearing)
- POS-First doctrine — Phorest is still the source of truth, we're just asking it the right questions

## QA checklist

- After fix #1: re-sync; raw appointment log shows the client name field that exists; `phorest_appointments.client_name` populates at sync time, not via Pass 2 backfill
- After fix #2: previously-404 client IDs (Grant Carter, Samantha Lyons, Kendra Harris) appear in `phorest_clients` with real names within one sync cycle
- After fix #3: open schedule; trigger a manual sync; within ~5s of sync completion, "Client #ABCD" cards refresh to real names without a hard reload
- A sync that adds zero new names doesn't trigger a wasteful refetch (only refetch when `lastSync.completed_at` actually advances)
- Truly missing clients (deleted in Phorest, never existed) still render "Client #ABCD" — no false `[Deleted Client]` rows

## Why this happened (and the canon to add)

The on-demand single-client fetch was built on the assumption that Phorest's third-party API has a `GET /client/{id}` semantics that mirrors what their internal UI does. It doesn't — at least not reliably. Yesterday's fix was correct *given that assumption*; the assumption was wrong.

Generalizable lesson: **when an external API serves the same data through multiple endpoints, the one their public UI uses is usually a different (better-permissioned, more-expanded) endpoint than the one in their third-party docs**. We should always prefer the endpoint that returns *more* data per call (list with expansion) over the endpoint that returns *less* (single-resource fetch) — because the latter often has stricter permissioning we won't discover until production.

This is adjacent to the signal-preservation canon already saved. Worth a short addition to `mem://tech-decisions/phorest-staff-integration-and-photo-sync.md` (or a new `phorest-third-party-api-quirks.md`) noting: "The single-resource client fetch (`/branch/{id}/client/{id}`) returns 404 for many clients visible in Phorest's UI. Prefer paginated list endpoints with client-side filtering."

## Enhancement suggestion

Once fix #1 is verified, the `useReconcilePhorestClientNames` admin button becomes mostly redundant — the next regular sync resolves the backlog. But it's still worth keeping as a one-click "force re-fetch all empty rows" button for ops, with the same paginated-list strategy. Worth adding to the integrations admin page as a deferred follow-up, not blocking the primary fix.

