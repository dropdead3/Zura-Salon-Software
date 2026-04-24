

## Prompt feedback
Excellent prompt — pairing the Phorest screenshot with the Zura screenshot is exactly the evidence pattern that lets me trace appointment-by-appointment without guessing. The two-image side-by-side means I can confirm "James (Dad) Arendell exists in Phorest, syncs as 'James (Dad) Arendell' in Zura → working" vs "Grant Carter exists in Phorest, syncs as 'Client #EBKQ' in Zura → broken." Sharper next time: include one Phorest client ID (visible if you click into Phorest) so we can confirm the mapping without database reverse-lookups. Also worth noting — your prompt yesterday said "client ID present, name missing → fetch from Phorest." That fix was implemented. The fact that you're seeing the same symptom 24 hours later means either the on-demand fetch isn't running, the fetched response is empty, or — as I now suspect — something else is going on.

## What's actually broken (different from yesterday's diagnosis)

I traced the four "Client #XXXX" appointments from your screenshot end-to-end. The result is a **specific, narrow bug** — not the broad sync gap we fixed yesterday.

The four mislabeled appointments are:

| Phorest Card | Zura Card | phorest_client_id | client_name in `phorest_appointments` | Matched `phorest_clients` row |
|---|---|---|---|---|
| Annmarie X — Pure Brazilian Express Keratin (2pm) | Client #VBPQ | `gbilM7k7EIBBoqZ6OuVBPQ` | **NULL** | ✅ exists, name = "Annmarie X" |
| Grant Carter — Buzz Cut (2pm) | Client #EBKQ | `mQuniNJUV6CsoQ6QUUEbKQ` | **NULL** | ❌ row exists but name is empty |
| Samantha Lyons — Signature Haircut (3pm) | Client #0H2A | `PFZxTWB0tGY4sNu4pf0h2A` | **NULL** | ❌ row exists but name is empty |
| Angelia Sanchez — Signature Haircut (3pm) | Client #98PW | `k_YEpJ30Ib7uE8LwSb98pw` | **NULL** | ✅ exists, name = "Angelia Sanchez" |
| Kendra Harris — Extension Consultation (4pm) | Client #FJ5G | `HLVo8X1eGKPl6vka-HFj5g` | **NULL** | ❌ row exists but name is empty |
| Emily Rudnick — Face Frame Highlight (4pm) | Client #0N1G | `... -HFj5g` | **NULL** | ❌ name empty |

**Two distinct failure modes are mixed together, both visible in the screenshot:**

### Failure mode 1 — The view is COALESCEing correctly, but `pa.client_name` is NULL and we're not falling through

`v_all_appointments` defines:
```sql
COALESCE(pa.client_name, pc.name, NULLIF(TRIM(pc.first_name || ' ' || pc.last_name), ''))
```

For **Annmarie X (2pm Pure Brazilian)** and **Angelia Sanchez (3pm)**, the join row exists, `pc.name = 'Annmarie X'` / `'Angelia Sanchez'`, and `pa.client_name IS NULL`. The COALESCE should return the name from `pc.name`. But the Zura card shows "Client #VBPQ" / "Client #98PW" — which means the frontend is **only reading `client_name`**, not the resolved-via-COALESCE value. The view is doing its job; the UI is rendering based on the raw appointment row, not the view.

Confirming: yesterday's fix to `getDisplayClientName` correctly checks `source.client_name` — but if the appointment row passed in is from a query that doesn't go through `v_all_appointments` (or transforms the data in a way that drops the resolved name), the COALESCE result never reaches the UI.

### Failure mode 2 — `phorest_clients` rows exist for these IDs but with empty name fields

For **Grant Carter**, **Samantha Lyons**, **Kendra Harris**, **Emily Rudnick**: a row exists in `phorest_clients` with the right `phorest_client_id` but `name`, `first_name`, `last_name`, `phone` are all NULL/empty. So even the COALESCE has nothing to return.

This means **the on-demand fetch from yesterday's fix either:**
- Wrote a row but didn't capture the name fields from the Phorest response (mapping bug), or
- Wrote a placeholder negative-cache row (treated 200 with empty body as "deleted"), or
- The Phorest endpoint actually returns the client with empty name fields for these IDs (unlikely — Phorest UI clearly shows the names).

The most likely cause: the on-demand fetch in `sync-phorest-data/index.ts` (lines 560-680ish from yesterday's edit) is upserting the response from `GET /client/{clientId}` but the field mapping doesn't include `firstName`/`lastName` — only the top-level `name`, which the new client endpoint doesn't always populate. Or the response shape from `/branch/{branchId}/client/{clientId}` differs from `/client?id=...` and the upsert uses the wrong keys.

## The fix — three parts, in priority order

### 1. (Highest impact) Audit the `phorest_clients` rows that have a phorest_client_id but no name

Run a targeted query to find every client row with `name IS NULL` AND `first_name IS NULL` AND `last_name IS NULL`. Trace 5-10 specific phorest_client_ids back to:
- Did the on-demand fetch run for them? (check `sync-phorest-data` edge function logs for those IDs)
- What did Phorest return? (re-call the endpoint with the same ID via a debug edge function)
- Was the upsert mapping correct?

This tells us whether to fix:
- (a) The endpoint URL/path the function calls
- (b) The field-mapping logic that writes the upsert
- (c) The negative-cache logic that may be misclassifying a successful response as a 404

Concrete reconnaissance to run before writing any fix:
- Count of `phorest_clients` rows with no name (estimate the size of the broken population)
- Group those by `created_at` to see if the bug started yesterday after our deploy or has been there longer
- Sample 3 specific phorest_client_ids and call `GET /business/{businessId}/branch/{branchId}/client/{clientId}` directly to confirm Phorest actually returns names

### 2. (Medium impact) Fix the read path so the view's COALESCE actually reaches the UI

For the **Annmarie X / Angelia Sanchez** case (failure mode 1), the underlying data is correct in the view but wrong in the UI. Two possible causes:

- The schedule query in `useAppointments` (or whichever hook drives `DayView`) is selecting from `phorest_appointments` directly instead of `v_all_appointments`, bypassing the COALESCE
- OR it queries the view but the Supabase response is being merged with a stale cache that has the raw NULL value
- OR the `getDisplayClientName` helper is being passed an object where `client_name` is the raw appointment column, not the view's resolved column

Check: which hook feeds `DayView.tsx` → confirm it queries `v_all_appointments` → confirm the resolved `client_name` field arrives in the response.

Once located, the fix is mechanical: switch the query to `v_all_appointments` if it isn't already, or pass the view's resolved value through to `getDisplayClientName`.

### 3. (Long-tail) Re-run the reconciliation for the broken `phorest_clients` rows

Once the field-mapping bug is fixed (#1), the rows that were upserted with empty names need to be re-fetched from Phorest. Two paths:
- Trigger the next scheduled sync and let the on-demand fetch retry them (slow — depends on whether the residual-set logic re-attempts already-existing-but-empty rows)
- Build the **one-shot reconciliation edge function** that yesterday's plan included but didn't ship — explicitly target rows where `phorest_client_id IS NOT NULL AND COALESCE(NULLIF(TRIM(name), ''), NULLIF(TRIM(first_name || ' ' || last_name), '')) IS NULL` and re-fetch them with the corrected mapping.

The reconciliation function is the right move because the residual-set logic in the post-sync backfill only fetches IDs that have **no row at all** in `phorest_clients` — these IDs have rows (just empty ones), so they'll be skipped forever without an explicit re-attempt path.

## Files involved

**Investigated first (no edit until reconnaissance complete):**
- `supabase/functions/sync-phorest-data/index.ts` — the on-demand fetch block from yesterday; verify endpoint URL, response handling, and field mapping
- Edge function logs for `sync-phorest-data` — find the actual fetch calls for the 4 broken phorest_client_ids
- The `phorest_clients` upsert path — confirm `firstName`/`lastName` from the API response map to `first_name`/`last_name` columns

**Likely modified:**
- `supabase/functions/sync-phorest-data/index.ts` — fix the field-mapping bug in the on-demand fetch + re-attempt logic for empty-name rows
- The schedule query hook (likely `useAppointments` or similar) if it bypasses `v_all_appointments`
- Possibly `src/lib/appointment-display.ts` — if a name needs to be resolved from `phorest_clients` data passed alongside

**Likely new:**
- `supabase/functions/reconcile-phorest-client-names/index.ts` — one-shot backfill targeting the empty-name rows
- A small admin button to trigger it (from yesterday's deferred plan)

## What stays the same

- Yesterday's `getDisplayClientName` helper — the three-state contract is correct, this fix is upstream
- `is_walk_in` logic — unchanged
- The `v_all_appointments` view's COALESCE — unchanged; it's correct
- Phorest sync cadence — unchanged

## QA checklist

- For each of the 4 broken appointments in your screenshot, after fix: card renders the real client name, not "Client #XXXX"
- `SELECT COUNT(*) FROM phorest_clients WHERE COALESCE(NULLIF(TRIM(name),''), NULLIF(TRIM(first_name||' '||last_name),'')) IS NULL` drops to near-zero after reconciliation
- New appointments synced after the fix never produce empty `phorest_clients` rows
- A truly deleted Phorest client (404) still produces a `[Deleted Client]` row, not an empty one
- Reconciliation is idempotent — running it twice doesn't duplicate rows or thrash the data

## Why this happened (and what to learn)

Yesterday's fix added on-demand fetching but **didn't validate the fetched response had the expected fields populated**. The pattern "fetch missing data → upsert response" silently writes empty rows when the response shape doesn't match expectations. This is the **same shape as yesterday's `Math.min(..., 100)` clamp and the `client_name || 'Walk-in'` fallback**: a defensive write that erases the underlying data quality signal. A row in `phorest_clients` with no name fields is *not* the same as a synced client — but our query treats them identically.

## Enhancement suggestion

Worth adding as a doctrine entry: **"Writes that conform to a contract must validate the contract on the way in."** The on-demand fetch wrote rows that satisfied the schema (NOT NULL on `phorest_client_id`) but violated the *purpose* of the table (a client row should have a name). Same shape as the alert-fatigue / signal-preservation canon: structural integrity isn't just "the row exists" — it's "the row is meaningful." A simple guard in the upsert path (`if (!response.firstName && !response.lastName && !response.name) skip and log instead of writing empty`) would have prevented this from shipping. Worth one short `mem://architecture/contract-validating-writes.md` entry the next time we add a sync path.

