

## Prompt review

Solid debug prompt — short, specific, names the page. Even better next time: tell me which tab and what you see ("Appointments tab shows 'No appointments found' but I know there should be data"). That confirms it's a query failure vs RLS vs empty filter, saving a round of triage.

## Root cause

Wave 16 narrowed the `SELECT *` on `v_all_appointments` into an explicit column list, and I included `_source` in that list. The actual column on the view is **`source`** (no leading underscore). Postgres returns:

```
400: column v_all_appointments._source does not exist
Hint: Perhaps you meant to reference the column "v_all_appointments.source".
```

Because the query 400s, `data` is empty → table renders "No appointments found." Same bug also affects the enrichment branch that checks `a._source === 'phorest'` and `a._source === 'local'` (those would silently always be falsy even after the select is fixed).

This is a Wave 16 regression, not an RLS or org-scoping issue.

## Plan — Wave 16.1: Fix `_source` column regression (P0 hotfix)

**Doctrine anchor:** `phorest-decoupling-and-zura-native-operations` (union view contract).

### Fix

In `src/hooks/useAppointmentsHub.ts`:

1. Replace `'_source'` in the `APPT_COLUMNS` list with `'source'` (and alias it via the PostgREST `select` syntax: `'source:source'` is unnecessary — just use `source`)
2. Update the three downstream references that read `a._source` to read `a.source` instead:
   - `localClientIds` filter (`a._source === 'local'`)
   - `customerNumber` ternary (`a._source === 'phorest'`)
   - `created_by_name` fallback (`a._source === 'phorest'`)
3. Keep everything else from Wave 16 (parallelization, `count: 'estimated'`, staleTime) intact

### Acceptance checks

1. No more 400 responses from `v_all_appointments` on the Appointments tab
2. Appointments rows render again with full enrichment (client name, phone, stylist, location, "Paid" badge, total paid)
3. Both Phorest-sourced and Zura-native (local) appointments display correct customer numbers and "created by" labels
4. Tests still pass (no test currently asserts the column name; this is a runtime contract)
5. Logged in `DEBUG_LOG.md` as Wave 16.1 hotfix with leverage marker

### Files touched

- `src/hooks/useAppointmentsHub.ts` — single column rename + three reference updates
- `DEBUG_LOG.md` — Wave 16.1 hotfix entry

### Why this slipped Wave 16

The narrow column list was inferred from the type contract used in code (`a._source`) rather than verified against the actual view schema. Trigger for follow-up: **add a one-time `code--search_files` for `_source` vs the live view definition** before any future SELECT-narrowing pass on union views.

### Deferred (unchanged from Wave 16)

- P1 #4 (transactions cross-filter "Paid" badge → RPC) — trigger: if hub still slow after this hotfix
- P1 #5 (`useGroupedTransactions` SELECT * → narrow) — trigger: next Transactions perf wave
- P2 #6 (parallelize afterpay + usage_charges) — trigger: bundled into next Transactions perf wave
- P2 #7 (Tooltip + Badge ref warning, plus the `BlurredAmount` ref warning now visible in `TillBalanceSummary`) — trigger: Wave 17 UI hygiene pass (one wave away)

