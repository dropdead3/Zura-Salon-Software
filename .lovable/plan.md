## Diagnosis: Why only 17 clients render

**Sync succeeded.** `phorest_clients` holds **3,883 rows** as expected. The view `v_all_clients` returns 3,899 rows when queried with the service role.

**RLS is silently filtering 3,866 of them out** for the authenticated user.

The historical RLS policy on `phorest_clients` (migration `20260406222544...`) scopes visibility through Zura's `locations` table:

```sql
USING (
  auth.uid() = preferred_stylist_id
  OR EXISTS (
    SELECT 1 FROM public.locations l
    INNER JOIN public.employee_profiles ep ON ep.organization_id = l.organization_id
    WHERE l.id = phorest_clients.location_id
      AND ep.user_id = auth.uid()
      AND ep.is_active = true
  )
)
```

For that EXISTS to return true, `phorest_clients.location_id` must point to a row in `locations`.

Audit result:

| Bucket | Row count |
|---|---|
| `location_id IS NULL` | **3,883 (100%)** |
| `location_id` orphaned | 0 |
| `location_id` resolves to a Zura location | 0 |

`phorest_branch_id` is also `NULL` on all 3,883 rows.

So the only rows the user can see are the ~17 where `auth.uid() = preferred_stylist_id` (the OR clause). Everything else is invisible to the directory query — the data is there, RLS just hides it.

### Why S7 didn't fix this

Wave S7 successfully fetched and persisted 3,883 records, but `syncClients` in `supabase/functions/sync-phorest-data/index.ts` writes the upsert payload without `location_id` or `phorest_branch_id`, even though the loop knows which branch each batch came from. The previous "working" state likely had a separate backfill job populating these columns, which has since been wiped (or never ran against the new rows).

This is **not** an RLS bug, **not** a sync-count bug, and **not** a view bug. It is a **column-population** bug: the sync writes identity but not tenant scope, so RLS cannot resolve the rows back to the org.

---

## Wave S7h — Backfill + sync hardening

### S7h.1 — One-time backfill migration (closes the visible gap immediately)

Map each `phorest_clients` row to a Zura `locations.id` via `phorest_branch_id`. Since the sync loop already iterates per branch, we can derive the mapping from the sync log or — more reliably — from `phorest_appointments`, which already carries both `phorest_branch_id` and the resolved `location_id` per client.

```sql
-- Backfill phorest_branch_id from any appointment we've seen for this client
UPDATE public.phorest_clients pc
SET phorest_branch_id = sub.phorest_branch_id
FROM (
  SELECT DISTINCT ON (phorest_client_id)
    phorest_client_id, phorest_branch_id
  FROM public.phorest_appointments
  WHERE phorest_client_id IS NOT NULL
    AND phorest_branch_id IS NOT NULL
) sub
WHERE pc.phorest_client_id = sub.phorest_client_id
  AND pc.phorest_branch_id IS NULL;

-- Backfill location_id from locations.phorest_branch_id mapping
UPDATE public.phorest_clients pc
SET location_id = l.id
FROM public.locations l
WHERE l.phorest_branch_id = pc.phorest_branch_id
  AND pc.location_id IS NULL;
```

For clients with **no appointment history** (purely imported contacts), fall back to the org's primary location. This is policy-acceptable because the alternative is permanent invisibility:

```sql
-- Last-resort fallback: assign to org's primary location based on
-- which org's sync log most recently touched this phorest_client_id.
-- Implemented as a CTE keyed off phorest_sync_log.organization_id.
```

Expected result: `location_id` populated on ≥99% of rows; directory shows ~3,883 clients for org admins/members.

### S7h.2 — Harden `syncClients` to write tenant scope at insert time

Modify the upsert payload in `supabase/functions/sync-phorest-data/index.ts` to always set:

- `phorest_branch_id`: the branch the loop is currently iterating (already known)
- `location_id`: resolved from the in-memory `branchId → locations.id` map that S7b already builds for region pinning

This prevents future syncs from re-introducing NULL-scoped rows. New clients become RLS-visible the moment they're upserted.

### S7h.3 — Add a regression guard

Append a post-sync assertion to the edge function's structured log:

```ts
const { count: orphanCount } = await supabase
  .from('phorest_clients')
  .select('id', { count: 'exact', head: true })
  .is('location_id', null);

if (orphanCount && orphanCount > 0) {
  console.warn(`[SYNC HEALTH] ${orphanCount} phorest_clients rows have NULL location_id — RLS will hide them`);
  // Also write to phorest_sync_log.health_warnings
}
```

This converts a silent visibility gap into an observable signal, so the next time a column-population bug ships, we catch it in the sync log instead of via a "why do I only see 17 clients" support ticket.

### S7h.4 — Verify in-app

After the migration runs:

1. Reload `/org/drop-dead-salons/dashboard/clients`.
2. Confirm header reads "**3,883 Clients**" (or close — small delta acceptable for archived/duplicate rows).
3. Spot-check a few previously missing names from the Phorest source list.
4. Confirm location filter dropdown produces non-empty subsets per branch.

### Files touched

- **New migration**: backfill `phorest_branch_id` then `location_id` on `phorest_clients`.
- **`supabase/functions/sync-phorest-data/index.ts`**: include `phorest_branch_id` and `location_id` in the per-batch upsert payload; add post-sync orphan-count assertion.

### Out of scope (deliberate)

- We are **not** weakening the `phorest_clients` RLS policy. The org-via-location join is correct; the fix belongs in the data layer, not the policy layer.
- We are **not** introducing an `organization_id` column on `phorest_clients`. The `locations` join is the canonical scoping path and adding a parallel column would create a drift surface.

### Approval ask

Approve **S7h** to backfill the 3,866 invisible rows, harden the sync to populate tenant scope at write-time, and add a regression guard. After approval I'll author the migration + edge-function patch and verify the directory count post-deploy.

---

### Prompt-craft feedback

Strong prompt — you correctly noticed the count discrepancy *between* a verified successful sync and the rendered UI, which is exactly the right place to push (most operators stop at "the sync said 3,883, ship it"). One sharpening for next time: when you spot a UI-vs-DB mismatch, naming the suspected layer ("is this RLS, the view, or the query?") forces me to audit all three explicitly rather than guessing — same answer, fewer round-trips.
