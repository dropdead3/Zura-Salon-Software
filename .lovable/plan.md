## Diagnosis

Your prompt is strong because it names concrete expected behavior from the source system and proposes plausible failure modes instead of just saying “it’s wrong.” That makes debugging much faster.

A tighter version for future debugging would be:

- expected source-of-truth record
- actual mirrored record
- whether the issue is wrong row, duplicate row, stale deleted row, or missing enrichment
- one exact example with staff + date + time

Example:
> In Phorest, Jamie has only one 2 Row Initial Install today at 2:30 PM. In Zura, Jamie shows both a 1 Row Reinstall and a 2 Row Initial Install at 2:30 PM. Investigate whether the old Phorest appointment was edited/deleted upstream but never soft-deleted locally, and separately why the client names for today’s unresolved cards still have IDs but no name.

## What is actually happening

This is not a live card-by-card read from Phorest. The schedule reads from the local mirrored table/view:

```text
Phorest API -> sync-phorest-data -> phorest_appointments -> v_all_appointments -> schedule UI
```

Current findings:

- The schedule is reading correctly from `v_all_appointments` / `phorest_appointments`.
- Client-name rendering is already correct in the UI via `getDisplayClientName()`.
- Today’s missing names are not a display bug: they are rows with `phorest_client_id` present but no matching `phorest_clients` row yet.
- Jamie currently has two active local rows at the same 2:30 PM start:
  - `1 Row Reinstall` for Melinda Bean
  - `2 Row Initial Install` with unresolved client name
- That strongly supports your stale-mirror theory: the old local row remained after the upstream appointment changed or was replaced.

## Root causes to fix

1. **No stale-appointment reconciliation**
   `sync-phorest-data` upserts whatever it fetches, but it does not soft-delete local Phorest appointments that disappear from the latest upstream fetch for the same branch/date window.

2. **Client resolution is still incomplete**
   Today’s unresolved cards are not missing because the UI forgot to join names. They are missing because those `phorest_client_id`s still do not exist in `phorest_clients`.

3. **The current on-demand client sweep is too broad and not exact enough for operator-visible rows**
   Logs show unresolved IDs remain after branch probing, so the sync needs a more surgical resolution path for visible appointments.

## Plan

### Wave S1 — Reconcile stale Phorest appointments
Update `supabase/functions/sync-phorest-data/index.ts` so each appointment sync also soft-deletes active local Phorest rows that were **not** returned by Phorest for the same branch/date window.

Scope:
- Compare fetched `phorest_id`s vs existing local `phorest_appointments` in the sync window
- Soft-delete local rows missing from the current upstream result
- Never touch local/Zura-native appointments
- Preserve existing operator soft-deletes
- Log counts and sample IDs for auditability

Outcome:
- Old rows like Jamie’s stale `1 Row Reinstall` stop surfacing after the next sync.

### Wave S2 — Make client-name resolution targeted for visible appointments
Strengthen the client backfill path so today/near-future appointments resolve first and by exact source context.

Scope:
- Persist the Phorest branch identifier on synced appointments
- Prioritize unresolved appointments in the operator-visible window first
- Resolve missing client names using exact unresolved `phorest_client_id`s, probing the appointment’s real branch first
- Backfill `phorest_appointments.client_name` immediately after successful resolution

Outcome:
- Appointment cards with valid IDs but missing names can resolve reliably instead of waiting on a broad client sweep.

### Wave S3 — Add sync-health enforcement for mirror correctness
Extend the sync contract so this kind of drift becomes detectable immediately.

Scope:
- Snapshot active appointment counts in the visible window before/after sync
- Snapshot resolved-name counts before/after sync
- Log a structured warning when:
  - stale rows are soft-deleted
  - name coverage drops materially
  - an unusually large unresolved client set remains

Outcome:
- Future mirror drift becomes observable instead of requiring a human to spot it in the calendar.

### Wave S4 — Verify against the exact Jamie case
After implementation, validate the specific operator complaint.

Acceptance checks:
- Jamie no longer shows the stale `1 Row Reinstall` if it is not present upstream
- Jamie retains only the valid upstream appointment(s)
- today’s unresolved-name count drops from the current residual set
- no fresh duplicate active rows are introduced by the reconciliation step

## Technical details

Files likely involved:
- `supabase/functions/sync-phorest-data/index.ts`
- one new migration for any schema support needed (likely `phorest_branch_id` on `phorest_appointments`, plus indexes if needed)

Implementation notes:
- The schedule UI likely does **not** need a rendering change for this issue.
- The fix belongs in the sync/mirror layer, not the card component.
- Reconciliation should be bounded to the sync window and branch context to avoid false deletions.
- Logging should follow the existing sync-health pattern rather than silently mutating rows.

## Enhancement suggestion

After this fix, the next prompt that would drive the cleanest follow-up is:

> Implement stale Phorest appointment reconciliation and targeted client-name resolution. Then verify the Jamie 2:30 PM case specifically and report: (1) which local row was soft-deleted, (2) whether the remaining appointment matches Phorest, and (3) how many of today’s unresolved client-name cards remain.
