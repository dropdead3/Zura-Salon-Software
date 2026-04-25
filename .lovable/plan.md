
## Phase 4 — Reconciliation Hardening

Three protective layers on top of Phase 3 linkage. Each anchored to an existing doctrine and shipped with an explicit deferral trigger so we don't over-build.

---

### 1. Atomic Reconciler RPC (ship now)

**Anchor:** *Edge Function Execution Context* + *Multi-Tenant Hardening* (eliminate read/write race windows in operational writes).

Today the reconciler in `sync-phorest-data` does:
1. `SELECT appointment_id FROM phorest_transaction_items` (filtered)
2. Chunked `UPDATE phorest_appointments ... WHERE id IN (batch)`

Race window: between (1) and (2), a stylist can edit an appointment's status in the dashboard. The TS reconciler will then overwrite it.

**Change:** Create `public.reconcile_appointment_status_via_linkage(p_location_id uuid, p_date_from date, p_date_to date)` as `SECURITY DEFINER`. Single SQL statement:

```sql
WITH candidates AS (
  SELECT DISTINCT t.appointment_id
  FROM phorest_transaction_items t
  WHERE t.location_id = p_location_id
    AND t.item_type = 'service'
    AND t.transaction_date >= p_date_from
    AND t.transaction_date < p_date_to
    AND t.appointment_id IS NOT NULL
)
UPDATE phorest_appointments a
SET status = 'completed', updated_at = now()
FROM candidates c
WHERE a.id = c.appointment_id
  AND a.status IN ('booked','confirmed','checked_in')
RETURNING a.id;
```

Returns `{ reconciled_count int, candidate_count int }` for log parity. Wrap the existing TS branch in a single `supabase.rpc('reconcile_appointment_status_via_linkage', ...)` call.

**Deferral trigger:** none — ship now, race risk is real today.

---

### 2. Linkage Drift Gauge (ship now, as a Visibility Contract)

**Anchor:** *Visibility Contracts* + *Alert Governance and Throttling* (silent above 90%, advisory below — no alert fatigue).

Currently coverage is 96.2% globally over the last 30 days. Phorest has changed payload shape once before; we want early warning, not a dashboard alarm.

**Change:**
- Add a Postgres view `v_linkage_coverage_30d` exposing per-location: `service_items`, `linked_items`, `coverage_pct`, `last_sync_at`.
- New hook `useLinkageCoverage(locationId)` returns `null` when `coverage_pct >= 90` (silence is valid output) and an advisory payload `{ coverage_pct, missing_count }` when below.
- Surface inside `SystemHealthSummary.services` as a synthetic service entry `phorest-linkage` with status `healthy | degraded` mapped at the 90% threshold. Reuses existing `useSystemHealth` plumbing — no new alert channel, no new badge.
- Suppression reason `linkage-coverage-healthy` logged via `reportVisibilitySuppression` (kebab-case taxonomy compliance).

**Deferral trigger:** none — ship now. Dirt cheap, exactly the kind of asymmetric early-warning Visibility Contracts exist for.

---

### 3. Tip Attribution Audit Job (defer; declare trigger)

**Anchor:** *Staff Tip Distribution* + *Analytics Data Integrity Standards* (operator trust erodes fastest at the payroll line).

Want a nightly job that flags appointments where `phorest_appointments.tip_amount ≠ SUM(linked_items.tip_amount)`.

**Why defer:** Right now linkage is 96.2%. The remaining 3.8% will produce false-positive drift (sum of linked tips ≠ recorded tip simply because not every line is linked yet). Shipping the audit before coverage is solid will burn operator trust on the *audit itself*.

**Deferral Register entry:**
- **Trigger condition:** `coverage_pct ≥ 99% sustained for 14 consecutive days` AND `linked-tip vs recorded-tip variance < 0.5% on a manual spot check`.
- **Until then:** Skeleton migration created (table `tip_attribution_drift` with `appointment_id, expected_tip, linked_tip_sum, variance, detected_at`) but no scheduled job, no UI surface.
- **Revisit signal:** Wire the gauge from #2 to flip a flag when the trigger condition holds; future loop ships the cron + surface.

---

### Files to be Created/Edited

- `supabase/migrations/<timestamp>_reconcile_status_rpc_and_linkage_gauge.sql` — new RPC + view + skeleton drift table
- `supabase/functions/sync-phorest-data/index.ts` — replace TS reconciler block (lines ~2126–2174) with single RPC call
- `src/hooks/useSystemHealth.ts` — fold linkage coverage into `SystemHealthSummary.services`
- `src/hooks/useLinkageCoverage.ts` — new Visibility-Contract hook (returns null above threshold)
- `mem://architecture/visibility-contracts.md` — append Deferral Register entry for the tip audit job

---

### Open Question for User

**Threshold for the linkage gauge: 90% (proposed) vs 95%.**
- 90%: catches the Phorest-payload-shape-change scenario decisively, low false-positive rate.
- 95%: tighter, but right now we'd be sitting at ~96% — small daily fluctuations could flap the gauge in/out of advisory state.

I'm proposing **90%** for stability. Confirm or override before I ship — this is a one-line constant but governs whether the gauge stays calm or chatters.

---

**Approve this plan?** (Tip audit job is explicitly deferred per the trigger above — only #1 and #2 ship in this loop.)
