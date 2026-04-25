# Phase 3 — Deterministic Appointment ↔ Transaction Linkage

## Prompt feedback
Strong prompt: scope ("appointment ↔ transaction"), mechanism ("backfill + sync-time write"), key columns ("client, date, staff, item~service"), and the **value unlocked** (payouts, tips, dock-to-checkout). The "removes fuzzy by date+client" framing is exactly the doctrinal anchor I needed.

One sharpening idea for next time: name the **collision policy upfront** ("on ambiguity prefer earliest unmatched, else leave NULL") so I don't have to infer it. I'll propose one below — flag if you want different semantics.

## Diagnosis (verified against live data)

- `phorest_transaction_items.appointment_id uuid` already exists with `FK → phorest_appointments(id)` and an index. Currently **0 of 2,709 rows populated**.
- Item type values are lowercase (`service`, `product`, `sale_fee`, …). Linkage is meaningful only for `service` (1,969 rows). Products/fees/deposits intentionally stay NULL.
- Match-rate analysis on (client_id, date, staff_id, normalized service_name):
  - **94% unique** (1,845 / 1,969)
  - **1.2% ambiguous** (24)
  - **5% no-match** (100, dominated by walk-ins / employee comps / "Complementary Adjustment Service" with no booked appointment — correctly should stay NULL)
- The current reconciler in `sync-phorest-data` flips status using a fuzzy `client_id + date` join. Once linkage is written, we can switch it to a deterministic `EXISTS (… WHERE appointment_id = a.id)` — no more bulk over-completion risk.

## Linkage doctrine

Three-tier resolver — strictest first, fall through on no match. Ambiguity (>1 candidate at the same tier) → leave NULL and log; never guess.

| Tier | Match keys | Confidence |
|---|---|---|
| 1 | `client_id` + `date` + `staff_id` + normalized `service_name` (exact or prefix) | High |
| 2 | `client_id` + `date` + `staff_id` (single appt only) | Medium |
| 3 | `client_id` + `date` (single appt only) | Medium-low |

Service-name normalization: `lower(regexp_replace(name, '\s+', ' ', 'g'))` then exact / prefix match.

Only `item_type = 'service'` is eligible. Products/sale_fees/deposits stay NULL by contract (Vish-classified-as-service edge cases already fall under `item_type='service'`).

## Implementation plan

### 1. SQL migration — backfill historical linkage
New migration `link_transaction_items_to_appointments.sql` (idempotent — only writes where `appointment_id IS NULL`). Three sequential `UPDATE … FROM (… subquery picking the unique candidate)` passes, one per tier. Each pass:
- Filters candidate rows: `appointment_id IS NULL AND item_type = 'service'`
- Joins against non-archived, non-deleted `phorest_appointments`
- Uses a `HAVING COUNT(*) = 1` gate inside the subquery so ambiguous matches are skipped
- Writes a single `appointment_id`

After all three passes, log linkage coverage via a `RAISE NOTICE` so it's visible in migration output.

### 2. Edge function — sync-time linkage write
Update `supabase/functions/sync-phorest-data/index.ts`:

- **`saveTransactionItems`** (line ~2799): after the upsert, run a per-branch resolver pass for the rows we just touched. Done in-function rather than via DB trigger so the same code path serves both backfill and live sync, and so we can log per-branch metrics.
- **Reconciler refactor** (lines ~2125–2172): once linkage exists, replace the fuzzy `client_id + date` reconciler with:
  ```ts
  // Promote appointments to 'completed' only when a linked service line exists
  UPDATE phorest_appointments a
     SET status = 'completed'
   WHERE status IN ('booked','confirmed','checked_in')
     AND appointment_date < CURRENT_DATE
     AND EXISTS (
       SELECT 1 FROM phorest_transaction_items t
       WHERE t.appointment_id = a.id AND t.item_type = 'service'
     );
  ```
  Keep the legacy fuzzy fallback behind a feature flag `USE_LEGACY_FUZZY_RECONCILE = false` for one release in case linkage coverage drops on a new branch.

### 3. Observability
- Add `[Linkage]` log lines: per-branch `candidates / tier1 / tier2 / tier3 / ambiguous / no_match`.
- Insert a `sync_health_metrics` row (or the existing equivalent — I'll grep first) with linkage coverage % so drift surfaces in the morning brief later.

### 4. Verification queries (run post-deploy)
- Coverage: `SELECT COUNT(*) FILTER (WHERE appointment_id IS NOT NULL)::float / COUNT(*) FROM phorest_transaction_items WHERE item_type='service';` — target ≥ 90%.
- Suzy-style audit: appointments with status='booked' but `EXISTS (linked service item)` — must be 0 after reconciler runs.
- Tip-routing sanity: `SUM(tip_amount)` grouped by `appointment_id` matches `phorest_appointments.tip_amount` to within rounding for completed appts.

## Files to edit
- **New** `supabase/migrations/<ts>_link_transaction_items_to_appointments.sql` — three-tier backfill
- `supabase/functions/sync-phorest-data/index.ts` — sync-time linkage write + reconciler refactor

## Out of scope (intentional)
- Changing `phorest_transaction_items` PK or unique key shape — current `(transaction_id, item_name, item_type)` stays.
- Touching Zura-native `transaction_items` (already linked per the April migration `idx_transaction_items_appointment_zura`).
- Any Phorest write-back — global write-back gate remains enforced.

## Open question (one)
Default policy on **tier-2/3 ambiguous matches** (multiple appts same client+date+staff): I'm proposing **leave NULL + log**, never auto-pick. Alternative is "pick earliest start_time." Confirm before I ship — this is a one-line diff but materially changes payout determinism for clients with same-day re-services.

## Further enhancement suggestions
1. **Linkage coverage gauge in Sync Health.** Surface tier-1/2/3 coverage % per branch as a Visibility Contract (`COVERAGE_THRESHOLD = 90`); silent above, advisory below — protects against silent regression when Phorest changes payload shapes.
2. **Tip reattribution audit.** Once linkage exists, add a one-shot script `audit-tip-attribution` that flags appointments where `phorest_appointments.tip_amount` ≠ `SUM(linked_items.tip_amount)`. Tips are the most operator-visible payroll line; a single mis-link gets noticed immediately.
3. **Trigger-based linkage as the long-term home.** Function-level resolver is right for now (visibility + iteration speed), but the doctrinal endpoint is a `BEFORE INSERT` trigger so any writer (sync, manual import, future POS adapters per `src/types/pos.ts`) inherits the contract for free. Defer until POS adapter #2 ships — premature otherwise.
