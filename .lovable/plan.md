

# Wave 12 — Deferred Levers Implementation

Five remaining enhancements from the Wave 11 audit, grouped by surface area.

---

## 1. Source-mix denominator correction

**Problem**: Source-mix tile uses event-touched orgs as denominator, mislabeling "% of dropouts" as "attribution health."

**Fix**: In `SetupFunnel.tsx`, query `organizations` count grouped by `signup_source` directly when no source filter is active. Switch to event-driven counts only when filtering. Add a label clarifying "% of org base" vs "% of cohort."

---

## 2. Cross-browser state mirroring

**Problem**: Banner snooze/attempt state lives in `localStorage` only — switching browsers re-triggers backfill and re-shows the banner.

**Fix**: 
- New table `org_setup_user_state` (user_id, organization_id, snoozed_until, dismissed_at, backfill_attempted_at) with RLS scoped to `auth.uid() = user_id`.
- Update `useBackfillTrigger.ts` to read/write this table first; `localStorage` becomes a write-through cache for offline resilience.
- Update `snoozeBackfillBanner` and `dismissBackfillBanner` helpers to mirror to DB.

---

## 3. Enhanced funnel CSV

**Problem**: Outreach campaigns need stage context to write source + stage-aware copy.

**Fix**: Add `completed_steps` (count) and `last_step_completed` (step key) columns to the CSV export in `SetupFunnel.tsx`. Compute from the latest commit log per org.

---

## 4. "Restart setup from scratch" admin action

**Problem**: Backfilled orgs with stale guesses have no rollback path.

**Fix**: 
- New edge function `reset-org-setup` (admin-only via `is_org_admin` check) that:
  - Deletes draft rows for the org
  - Deletes synthetic commit log entries (`source = 'backfill'` only — preserves wizard history)
  - Resets `signup_source` to `organic` and clears `setup_completed_at`
- Add a destructive button in admin settings → Setup section with confirmation dialog.

---

## 5. Funnel regression alerts

**Problem**: No monitoring when completion rate craters week-over-week.

**Fix**: 
- New edge function `setup-funnel-digest` scheduled weekly (Mondays).
- Compares current week's completion rate to 4-week trailing average.
- When delta < -20%, posts to platform notifications via `createNotification` (alert-governance throttling applies — one alert per week max).
- Cron via `pg_cron` + `pg_net` (insert tool, not migration, since it includes the project URL).

---

## Technical notes

- New table requires migration with RLS policies scoped to `user_id` (not `organization_id` — this is per-user state).
- `reset-org-setup` must use service-role client to bypass RLS on `org_setup_drafts` and `org_setup_commit_log`.
- Funnel digest should query organizations created in the last 90 days only to keep the comparison meaningful.
- `verify_jwt = false` for both new functions in `supabase/config.toml`.
- The destructive reset button needs the standard "type RESET to confirm" pattern — this is irreversible for the synthetic data path.

---

## Files affected
- `src/pages/dashboard/platform/SetupFunnel.tsx` (denominator fix, CSV columns)
- `src/hooks/onboarding/useBackfillTrigger.ts` (DB state mirror)
- `src/components/admin/settings/SetupResetCard.tsx` (new — destructive action)
- `supabase/functions/reset-org-setup/index.ts` (new)
- `supabase/functions/setup-funnel-digest/index.ts` (new)
- `supabase/config.toml` (two new function blocks)
- New migration: `org_setup_user_state` table + RLS

