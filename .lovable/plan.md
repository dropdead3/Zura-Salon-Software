## What we're fixing

3,192 of 3,192 active clients have `visit_count = 0/null`, `total_spend = 0/null`, `last_visit_date = null`. Confirmed with `SELECT COUNT(*) FROM clients`. The Phorest sync at `supabase/functions/sync-phorest-data/index.ts:1054-1058` writes `client.appointmentCount || 0` — Phorest's payload returns falsy values for these, so every sync overwrites the columns with zeros. Meanwhile we have 3,326 appointments across 1,087 distinct `phorest_client_id`s, 2,153 of them completed. **The truth is sitting in `phorest_appointments` already — we just have to derive it locally instead of trusting Phorest's roll-up fields.**

This closes the last inflated-count surface (Client Directory, command-surface preview via `useClientPreviewData`, re-engagement hub, CLV, segments) without each consumer re-grouping in JS.

## Architecture: Zura derives, Phorest no longer overwrites

Same shape as the schedule-side and client-history work: derive once at the DB, consume everywhere. Phorest's `appointmentCount` / `totalSpend` / `lastAppointmentDate` fields stop being trusted — they're stale and were never our system of record per the Phorest decoupling doctrine (`mem://architecture/phorest-decoupling-and-zura-native-operations`).

## Step 1 — Postgres view: `v_client_visit_stats`

A read-only view that computes per-client metrics from `phorest_appointments` using the same gap-≤-5-min rule as the JS utilities, so timeline / directory / preview all match.

```sql
CREATE OR REPLACE VIEW public.v_client_visit_stats AS
WITH ordered AS (
  SELECT
    a.phorest_client_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.location_id,
    a.total_price,
    a.status,
    LAG(a.end_time) OVER w   AS prev_end,
    LAG(a.appointment_date) OVER w AS prev_date,
    LAG(a.location_id) OVER w AS prev_location
  FROM public.phorest_appointments a
  WHERE a.phorest_client_id IS NOT NULL
    AND a.deleted_at IS NULL
    AND a.is_archived IS NOT TRUE
  WINDOW w AS (
    PARTITION BY a.phorest_client_id
    ORDER BY a.appointment_date, a.start_time
  )
),
flagged AS (
  SELECT
    *,
    CASE
      WHEN prev_end IS NULL THEN 1
      WHEN appointment_date <> prev_date THEN 1
      WHEN COALESCE(location_id,'') <> COALESCE(prev_location,'') THEN 1
      WHEN EXTRACT(EPOCH FROM (start_time - prev_end))/60 > 5 THEN 1
      ELSE 0
    END AS visit_break
  FROM ordered
),
grouped AS (
  SELECT
    phorest_client_id,
    SUM(visit_break) OVER (PARTITION BY phorest_client_id ORDER BY appointment_date, start_time) AS visit_index,
    appointment_date,
    total_price,
    status
  FROM flagged
),
visits AS (
  SELECT
    phorest_client_id,
    visit_index,
    MIN(appointment_date) AS visit_date,
    SUM(COALESCE(total_price, 0)) AS visit_total,
    -- A visit "counts" if any member is non-cancelled (mirrors JS aggregate-status logic)
    bool_or(status <> 'cancelled') AS counts_as_visit,
    bool_or(status = 'completed') AS has_completed
  FROM grouped
  GROUP BY phorest_client_id, visit_index
)
SELECT
  phorest_client_id,
  COUNT(*) FILTER (WHERE counts_as_visit) AS visit_count_grouped,
  COUNT(*) FILTER (WHERE has_completed)   AS completed_visit_count,
  MAX(visit_date) FILTER (WHERE has_completed) AS last_visit_date,
  MIN(visit_date) FILTER (WHERE has_completed) AS first_visit_date,
  SUM(visit_total) FILTER (WHERE has_completed) AS total_spend_observed
FROM visits
GROUP BY phorest_client_id;
```

Notes locked into the migration as comments:
- 5-min gap mirrors `MAX_VISIT_GAP_MINUTES` in `src/lib/visit-grouping.ts` and `src/lib/client-visit-grouping.ts`. If we ever tune one, all three change in lock-step.
- Location is part of the partition for parity with the schedule-side rule (a single client at two locations same day is two visits).
- `total_spend_observed` filters to completed visits only — bookings/no-shows must not inflate spend (CLV doctrine, `mem://features/client-lifetime-value-clv`).
- `last_visit_date` is the latest **completed** visit, not the latest scheduled — operators ask "when did they last sit in the chair," not "when do they have an appointment on the books."

## Step 2 — RPC: `refresh_client_visit_stats(p_organization_id uuid DEFAULT NULL)`

`SECURITY DEFINER`, owned by `postgres`, scoped via `set search_path = public`. Updates `clients` from the view in a single statement:

```sql
CREATE OR REPLACE FUNCTION public.refresh_client_visit_stats(p_organization_id uuid DEFAULT NULL)
RETURNS TABLE(updated_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH upd AS (
    UPDATE public.clients c
    SET
      visit_count = COALESCE(s.visit_count_grouped, 0),
      total_spend = COALESCE(s.total_spend_observed, 0),
      last_visit_date = s.last_visit_date,
      updated_at = now()
    FROM public.v_client_visit_stats s
    WHERE c.phorest_client_id = s.phorest_client_id
      AND c.is_archived IS NOT TRUE
      AND (p_organization_id IS NULL OR c.organization_id = p_organization_id)
      AND (
        c.visit_count IS DISTINCT FROM COALESCE(s.visit_count_grouped, 0)
        OR c.total_spend IS DISTINCT FROM COALESCE(s.total_spend_observed, 0)
        OR c.last_visit_date IS DISTINCT FROM s.last_visit_date
      )
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM upd;
  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_client_visit_stats(uuid) TO authenticated, service_role;
```

The `IS DISTINCT FROM` guard means the RPC is idempotent and cheap when nothing changed — safe to call after every appointment write.

## Step 3 — Stop the sync from clobbering

In `supabase/functions/sync-phorest-data/index.ts` lines 1054-1058: **remove** `visit_count`, `total_spend`, `last_visit`, `first_visit` from the upsert payload. Phorest's roll-up fields are no longer the source of truth — Zura's appointments are. The sync continues to write identity fields (name, email, phone, address, VIP, notes, preferred stylist, etc.) — those still belong to Phorest until the broader decoupling lands.

After the upsert loop completes, call:

```ts
await supabase.rpc('refresh_client_visit_stats', { p_organization_id: null });
```

once at the end (not per-client — a single statement updates everyone in O(n) with the view).

## Step 4 — Refresh after appointment writes

Add the same RPC call as a fire-and-forget at the tail of:
- `supabase/functions/update-phorest-appointment/index.ts` (status changes, reschedules) — scope to the affected `organization_id`
- Any function that creates/cancels appointments and currently leaves `clients.visit_count` stale

These are micro-cost (the IS DISTINCT FROM guard skips no-op rows) and keep the directory honest in real time after a check-in or cancellation. Wrapped in `try/catch` with a `console.warn` — never block the appointment write on a stats refresh.

## Step 5 — One-time backfill

Migration ends with a single call:

```sql
SELECT * FROM public.refresh_client_visit_stats(NULL);
```

That alone fixes 1,087 of the 3,192 clients (the ones with appointment history) on the migration's first run. The other 2,105 stay at zero, which is correct — they have no recorded appointments yet.

## Step 6 — Bundle `total_spend` for CLV (the enhancement you flagged last turn)

Already covered in Step 2's UPDATE. CLV calculators (`mem://features/client-lifetime-value-clv`) and segments now read truthful `total_spend` without any code change on their side. Visit-level grouping fixes both metrics with one utility — same canon as the previous waves.

## Files involved

**New:**
- `supabase/migrations/<timestamp>_v_client_visit_stats.sql` — view + RPC + grants + backfill call

**Modified:**
- `supabase/functions/sync-phorest-data/index.ts` — drop 4 fields from upsert (lines 1054-1058), add single RPC call after loop
- `supabase/functions/update-phorest-appointment/index.ts` — fire-and-forget RPC call after successful write, scoped to org

**Untouched:**
- `clients` table schema (just changing what writes to it)
- `phorest_appointments` (read-only source)
- `src/lib/visit-grouping.ts`, `src/lib/client-visit-grouping.ts` (JS utilities stay — they serve real-time UI; the DB view is the persisted cache)
- `useClientPreviewData`, `VisitHistoryTimeline`, Client Directory, command-surface preview — all already read `clients.visit_count` / `total_spend` / `last_visit_date`, and start showing truthful numbers automatically

## QA checklist

- After migration: `SELECT COUNT(*) FROM clients WHERE visit_count > 0` should be ~1,087 (matches distinct phorest_client_id with appointments)
- Spot-check Carmen X (the multi-service client we used for the schedule-side merge): her grouped `visit_count` should be lower than her raw appointment count
- Cancel a future appointment in the UI → its client's `visit_count` should not change (cancellations don't count as visits)
- Mark an appointment `completed` → that client's `last_visit_date` updates within the same request cycle
- Re-run Phorest sync → `visit_count` does **not** get reset to 0
- Client Directory and command-surface client preview now show non-zero counts and last-visit dates

## Why this is the right shape

Mirrors the doctrine already locked in: one derivation lives in one place (DB view), the rest of the system reads it. Same canon as the schedule-merge utility and the client-history utility — one new utility unlocks downstream truthfulness across multiple surfaces. It also retires Phorest's roll-up fields from our trust boundary, which is exactly the direction `mem://tech-decisions/phorest-decoupling-strategy` already points us.

## Memory to update after this ships

Add a short note under `mem://architecture/phorest-decoupling-and-zura-native-operations` (or as its own bullet in Core): **`clients.visit_count`, `clients.total_spend`, and `clients.last_visit_date` are derived locally via `v_client_visit_stats` + `refresh_client_visit_stats` — the Phorest sync must never write to these columns again.** This is exactly the kind of "write satisfied the schema; nothing consumed it; truth was destroyed" anti-pattern worth pinning so a future sync change doesn't silently re-introduce it.

---

## Prompt feedback

Strong prompt — you named the exact column (`clients.visit_count`), the exact downstream consumers (`useClientPreviewData`, directory), the canonical pattern to follow, and even pre-staged the architectural choice (nightly job vs view). That's the kind of prompt that lets me skip discovery and go straight to locking the migration. The "same canon as before" framing is doing real work — it tells me you want the *shape* preserved, not just the symptom fixed.

One thing that would have made it tighter: explicit phasing. You implied "let's just do the view," but the right answer turned out to be view + RPC + sync-stops-clobbering + per-write refresh + backfill — five moves, not one. Next time, when you suspect a fix has multiple seams, ask "what's the full surface area here?" and let me enumerate before you commit to a shape. That keeps you from approving "just a view" when the real fix needs the sync change too.

## Enhancement suggestion

Once this lands, the natural next domino is a **`v_client_visit_stats_diagnostics`** view (or a small `/dashboard/_internal/client-stats-audit` page like the spatial-audit harness) that lists clients whose cached `clients.visit_count` differs from `v_client_visit_stats.visit_count_grouped`. In steady state it should be empty — any non-empty rows mean an appointment write skipped the RPC refresh. Same pattern as the visibility-contracts deferral register: silent in healthy operation, loud when something drifts. Cheap to build, catches a whole class of future regressions before they reach the operator.