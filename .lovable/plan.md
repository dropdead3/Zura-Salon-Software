

## Diagnosis

The Phorest appointment sync is hard-capped to a tiny 8-day window (today → today + 7), with no historical backfill. Confirmed against the live database:

- Earliest appt in `phorest_appointments`: **2026-01-23**
- Latest appt: **2026-04-25** (today + 7)
- Recurring 15-min cron pulls **151 records** every cycle — the full today→+7 window
- Anything beyond 7 days into the future never lands in the DB. Anything in the past that wasn't captured by an earlier one-off backfill never arrives either.

This matches the screenshot exactly: only "Week of Apr 20" (which contains today + the next 7 days) has data. Apr 27, May 4, May 11, May 18 are empty because the sync has never asked Phorest for them.

The cause is in `supabase/functions/sync-phorest-data/index.ts` lines **2058–2073**:

```ts
if (quick) {
  defaultFrom = todayStr;
  defaultTo  = today + 7 days;
} else {
  defaultFrom = date_from || todayStr;          // past defaults to TODAY, not back
  defaultTo   = date_to   || (today + 7 days);  // forward only 7 days
}
```

Both modes default the past edge to today and the future edge to today + 7. The recurring cron (every 15 min) hits this with no `date_from`/`date_to`, so it only ever syncs the same 8-day rolling window. Phorest itself is fine — we're just never asking for the rest.

The function already supports `date_from` / `date_to` and chunks calls into 30-day windows internally, so the underlying engine is capable of much larger pulls. The defaults are the only thing limiting it.

## Fix

**Two coordinated changes:**

### 1. Widen the default sync window in `sync-phorest-data/index.ts`

For appointments, replace the today→+7 default with a meaningful operational window:

- **Quick mode** (high-frequency cron): today − 1 day → today + 30 days. Keeps the cron cheap but covers the realistic operational horizon (next month of bookings + yesterday's stragglers for late-completed appts).
- **Full / unspecified mode**: today − 90 days → today + 90 days. Matches what the dashboard/reports expect (90-day historical analytics + forward booking visibility). The internal 30-day chunker already handles this safely.
- Continue to honor explicit `date_from` / `date_to` from callers (e.g., `usePhorestCalendar` already passes them).

Apply the same pattern to the sales window so it matches actuals reporting:
- Quick: yesterday → today (unchanged)
- Full: today − 90 days → today (today's `30 days` is too narrow for the Sales card's 90-day filter)

### 2. One-time historical backfill

Trigger a single `sync-phorest-data` call with explicit `date_from` (e.g., 365 days ago) and `date_to` (e.g., today + 90 days) to seed everything missing past Jan 23 forward through summer. The function's existing 30-day chunking handles the volume safely. This is a one-shot operation, not a code change.

### 3. Add a "Sync Window" log line

Inside `syncAppointments`, log the resolved `dateFrom`/`dateTo` and the count of chunks fetched so future regressions are obvious in the edge function logs (we currently only log per-branch totals).

## Out of scope

- Phorest API rate limiting strategy (current per-branch / per-chunk pagination is already fine for a 6-month range)
- Migrating cron schedule itself (frequency stays at 15 min)
- Decoupling toward Zura-native appointments (separate doctrine track)
- Sales sync window beyond the 90-day alignment fix above
- Animation / UI work from previous loops

## Files

- **Modify**: `supabase/functions/sync-phorest-data/index.ts` — replace the default window block at lines 2058–2073 (appointments) and 2169–2193 (sales) with the wider quick/full defaults described above. Add a sync-window log line at the top of `syncAppointments`.
- **Operational (no file change)**: trigger one manual `sync-phorest-data` invocation with `{ sync_type: 'appointments', date_from: '<365 days ago>', date_to: '<+90 days>' }` after deploy to backfill the gap.

