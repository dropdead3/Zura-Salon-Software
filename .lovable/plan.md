# Why Suzy's card says "Unconfirmed"

## Diagnosis (confirmed against the live database)

Suzy Imel's April 24, 2026 appointment is row `bf16250a-ded7-4c83-b280-546b07876acf` in `phorest_appointments` with `status = 'booked'`. Status determines the badge — `booked` maps to the label **"Unconfirmed"** in `src/lib/design-tokens.ts` (lines 336/354).

Suzy *was* checked out at the POS — there are five `phorest_transaction_items` rows on April 24 for her `phorest_client_id = woN5X2F8OXyyilQKuNFvew`, including the `Natural Root Retouch` service line for $152.00 that matches her appointment exactly.

So the data is in the system. The reconciliation step simply isn't flipping `booked → completed`.

This is **not isolated to Suzy**. On April 24 (yesterday), the schedule has:
- 21 `confirmed`, 3 `completed`, **18 `booked`**
- Of those 18 `booked` rows, **15 already have a matching transaction in `phorest_transaction_items`** for the same `phorest_client_id` + same date

Every one of those 15 should have been auto-completed.

## Root cause

`supabase/functions/sync-phorest-data/index.ts` lines 2113-2151 contains the reconciler that flips appointments to `completed` when a same-day transaction exists. It iterates the **in-memory `purchases` array fetched from Phorest**, not the persisted rows in `phorest_transaction_items`. The filter is:

```ts
const uniqueClientDates = [...new Set(
  purchases
    .filter((p: any) => p.clientId && p.purchaseDate)   // ← strict field names
    .map((p: any) => `${p.clientId}|${p.purchaseDate?.split('T')[0]}`)
)].filter(...);
```

Three fragility points, in priority order:

1. **Field-name drift between writer and reconciler.** Twenty lines below (the transaction-record builder), the same `purchase` object is read with multiple fallbacks: `purchase.purchaseDate || purchase.createdAt || purchase.date` and `purchase.clientId || purchase.client?.clientId`. The reconciler uses neither fallback. Phorest returns slightly different shapes across endpoints (`/sales`, `/staffperformance`, etc.), so `purchases` can have populated `client.clientId`/`createdAt` but empty `clientId`/`purchaseDate` — and the entire reconciliation silently no-ops.

2. **Reconciliation depends on the API payload, not the database.** `phorest_transaction_items` already proves the sale exists, but the reconciler ignores it. If a sale was synced in an earlier run and the current run returns it differently shaped (or skips that branch's date range), the appointment never gets flipped — even though the truth is sitting in our own table.

3. **Status updates only, no audit linkage.** The reconciler updates `status` in bulk by `(client_id, date)` but never writes the `appointment_id` back onto the matched `phorest_transaction_items`. That's why every transaction row in our DB has `appointment_id = NULL`. Long-term this blocks per-appointment revenue, tip distribution, and dock-to-checkout reconciliation.

## Plan

### Phase 1 — Fix the reconciler (P0, ships this turn)

**`supabase/functions/sync-phorest-data/index.ts`** — replace the `purchases`-based reconciler block (lines 2113-2151) with a **DB-driven reconciler** that runs once per branch, immediately after the transaction items are upserted:

- Query `phorest_transaction_items` for this branch where `transaction_date >= salesFrom AND transaction_date < today` (strictly past).
- Project to unique `(phorest_client_id, transaction_date)` keys.
- For each batch of 50, run the same `phorest_appointments` update (`status='completed'` where status IN booked/confirmed/checked_in).
- Add structured logging: `[Reconcile] branch=… past_dates=N candidates=K reconciled=R`.

This eliminates the field-name fragility and makes reconciliation correct against any prior sync's data, not just the current payload.

### Phase 2 — One-time backfill for existing drift (P0, ships this turn)

After deploying Phase 1, run a one-shot migration to repair the historical drift:

```sql
UPDATE phorest_appointments a
   SET status = 'completed'
  FROM (
    SELECT DISTINCT phorest_client_id, transaction_date
      FROM phorest_transaction_items
     WHERE transaction_date < CURRENT_DATE
  ) t
 WHERE a.phorest_client_id = t.phorest_client_id
   AND a.appointment_date  = t.transaction_date
   AND a.status IN ('booked','confirmed','checked_in')
   AND a.is_archived = false;
```

This will heal Suzy and the other 14 affected April-24 appointments, plus any older drift not caught above. Will be wrapped in a migration the user approves before execution.

### Phase 3 — Appointment ↔ transaction linkage (P1, deferred)

`phorest_transaction_items.appointment_id` is currently always NULL. After Phase 1 lands, add a follow-up backfill + sync-time write that links each transaction line to the closest matching `phorest_appointments` row by `(phorest_client_id, date, phorest_staff_id, item_name~service_name)`. This unlocks per-appointment payout accuracy and removes the "fuzzy by date+client" reconciliation pattern entirely.

**Deferred** — not required to fix the user-visible "Unconfirmed" bug. Will be planned separately once Phase 1 is verified.

## Files to be edited

- `supabase/functions/sync-phorest-data/index.ts` — replace lines 2113-2151 with DB-driven reconciler
- New SQL migration — one-time backfill (Phase 2)

## Verification after deploy

1. Trigger a sales sync.
2. Re-query `phorest_appointments` for `id='bf16250a-ded7-4c83-b280-546b07876acf'` → expect `status='completed'`.
3. Re-open Suzy's card on `/dashboard/schedule` → progression bar should show **COMPLETED** filled.
4. Spot-check the other 14 affected April-24 clients (Ava Freiling, Emily Hanratty, Jessica Stiner, Jordyn White, Kendra Harris, Mel Baeza, Olivia Self, Shea Helmstetter).

---

## On your prompt (positive feedback + how to sharpen it)

**What worked well:** You gave me three perfectly aligned signals — the **client name** (lookup target), the **observed UI state** ("Unconfirmed"), and the **expected reality** ("completed yesterday, checked out at POS"). That triangulation is exactly what makes a bug report debuggable in one pass instead of three. I went straight to the data, didn't have to guess.

**One sharpening move for next time:** Add the **scope question** alongside the symptom. Something like: *"Is this just Suzy or are other April 24 appointments also stuck on Unconfirmed?"* That single question would have cued me to query the day-wide status distribution **first**, which is what surfaced the real story (15 of 18 affected, not 1 of 1). Symptom + scope together turns a single-bug report into a systemic-bug report — and the fix scope changes accordingly.

A reusable pattern: **Subject + Symptom + Expected + "Is this isolated?"**

## Further enhancement suggestions

1. **Sync health surface in the morning brief.** When ≥3 past-day appointments still show `booked` while matching transactions exist, surface a "Status drift detected — N appointments need reconciliation" line in `{{EXECUTIVE_BRIEF_NAME}}`. Operators should never discover this by spotting one card.

2. **Reconciler observability.** Emit a `phorest.reconciliation.completed` event row to `phorest_sync_log` with `{ branch, candidates, reconciled, skipped_reason }` so silent no-ops become visible in the sync log instead of dying in console.

3. **Status-stuck audit query as a saved Report.** Add a Reports entry: "Appointments with sales but no completion" — same join we used to diagnose Suzy. Makes drift continuously inspectable, not just reactively diagnosed.
