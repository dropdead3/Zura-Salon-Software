
## Phased Remediation Plan — 12 Findings

Sequenced per audit doctrine: **P0s ship in separate waves, never bundled.** After each phase, I verify resolution + scan for adjacent gaps before moving on.

---

### Phase 1 — Sync Log Timestamp Bug (P0, isolated)

**Finding #1**: `completed_at` predates `started_at` because `logSync()` only inserts `completed_at`, letting the DB default for `started_at` fire after.

**Fix**: In `sync-phorest-data/index.ts` `logSync()`, capture `startedAt = new Date()` at the top of each sync handler and pass it explicitly into the insert. Backfill no-op (historic rows stay broken; future rows correct).

**Verify**: Query `phorest_sync_log` post-deploy — confirm `completed_at >= started_at` and durations are positive. Check no monitoring code depends on the old broken shape.

---

### Phase 2 — SECURITY DEFINER View Audit (P0, investigation → fix)

**Finding #2**: 6 ERROR-level definer views flagged by Supabase linter.

**Fix**: 
1. Run `supabase--linter` to enumerate the 6 view names.
2. For each: read the view SQL, judge whether definer is intentional (e.g., aggregating across tenants for platform admins) or accidental.
3. Convert accidental ones to `SECURITY INVOKER` via migration.
4. For intentional ones, document in `mem://security/multi-tenant-isolation-and-hardening` with justification.

**Verify**: Re-run linter — zero ERROR-level definer warnings remain (or each is documented).

---

### Phase 3 — RLS `USING(true)` Audit (P0)

**Finding #3**: `day_rate_bookings` INSERT is `WITH CHECK (true)` — any auth user writes any row. Plus 7 other tables need per-table review.

**Fix**:
1. Enumerate all `USING(true)` / `WITH CHECK (true)` policies.
2. Categorize: (a) shared catalog (acceptable), (b) needs `organization_id` scoping, (c) needs user scoping.
3. Migration to replace category (b)/(c) with proper `is_org_member()` / `auth.uid()` checks.

**Verify**: Linter clean; spot-check with a second-org test query that writes are correctly rejected.

---

### Phase 4 — Storage Bucket Listing (P0)

**Finding #4**: 7 public buckets allow file enumeration.

**Fix**: Per bucket, decide: (a) keep public read on individual objects but restrict LIST to authenticated org members, or (b) move to signed-URL access pattern. Migration on `storage.objects` policies.

**Verify**: Anonymous `list()` call returns empty/denied; existing `<img src>` references still resolve.

---

### Phase 5 — Sync Coverage Gaps #5 + #6 (P1, single decision)

**Findings #5/#6**: 31–180 day appts and >yesterday sales only refresh once daily.

**Fix**: Extend the 15-min cron's appointment window from `d-1 → d+30` to `d-1 → d+90` (~700 records, still cheap). Add a separate hourly cron for `d+90 → d+180`. For sales, extend quick mode from yesterday→today to last-7-days→today.

**Verify**: Watch `[SYNC WINDOW]` logs for one cron cycle; confirm record counts land in expected ranges; spot-check a far-future appointment edit propagates within target SLA.

---

### Phase 6 — Alert Throttling (P2)

**Finding #7**: `notifyFailure` fires every 15 min on persistent errors.

**Fix**: Use the existing `createNotification` helper from `_shared/notifications` (per `mem://architecture/alert-governance-and-throttling`) which already implements bucketed dedup. Bucket key: `(syncType, error_signature_hash)`, TTL 1 hour.

**Verify**: Force a failure, confirm exactly one alert per hour, not per cron tick.

---

### Phase 7 — Hygiene Cluster #8–#12 (P2, combined loop)

- **#8** Add pg_cron job: `DELETE FROM phorest_sync_log WHERE created_at < now() - interval '60 days'` daily at 3 AM.
- **#9** Confirm `supabase/config.toml` has `[functions.sync-phorest-data] verify_jwt = false` (already present per current file — verify only).
- **#10** Delete `src/lib/capital-engine/financing-engine.ts` after confirming zero consumers via search.
- **#11** Add `[SYNC WINDOW] Appointments: ${dateFrom} → ${dateTo}` log line in `syncAppointments` to match sales.
- **#12** Audit log volume; trim verbose `console.log` in hot loops if Supabase log retention is being saturated.

**Verify**: Linter clean, dead code gone, logs readable, retention job listed in `cron.job`.

---

## Process between phases

After each phase ships, I will:
1. Verify the specific fix resolves cleanly (queries, linter, logs).
2. Scan for new/adjacent gaps that the fix may have exposed.
3. Report back with a short status before starting the next phase.

## Out of scope (explicit)

- Phorest decoupling work (separate doctrine track)
- Cron frequency changes beyond the new hourly job in Phase 5
- Frontend perf, AI evaluation, test coverage

## Files touched (cumulative)

- `supabase/functions/sync-phorest-data/index.ts` (Phases 1, 5, 6, 7)
- DB migrations for definer views, RLS policies, storage policies, retention cron (Phases 2, 3, 4, 7)
- `src/lib/capital-engine/financing-engine.ts` — delete (Phase 7)
- Memory updates as each P0 lands

## Recommended start

**Phase 1** — smallest, cleanest, unblocks all sync monitoring. Approve and I'll ship it, verify, then surface Phase 2's enumerated definer views for your review.
