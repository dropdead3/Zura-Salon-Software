

# Wave 10 Audit — Gaps, Bugs, Enhancements

Cross-cutting review of the 10-wave backfill + funnel + outreach build. Findings ranked by severity with doctrine anchors and leverage markers.

---

## P0 — Ship-blocking bugs

### 1. Cron job posts to processor with broken auth — follow-ups never fire
`supabase/migrations/20260421062321_*.sql` schedules `process-setup-followups` hourly using `current_setting('app.settings.service_role_key', true)`. **Verified in DB: this setting is unset (`has_setting = false`).** Every cron tick sends `Authorization: Bearer ` (empty). The function deploys with `verify_jwt = true` by default → **0% delivery rate**.
- Fix: add `verify_jwt = false` block in `supabase/config.toml` for `process-setup-followups`, drop the auth header from the cron `net.http_post`, and rely on the function's own service-role client. Doctrine: edge-function-execution-context.

### 2. `setup_outreach_log` insert path is RLS-blocked from the client
Table policies require `is_platform_user(auth.uid())`. The CSV export in `SetupFunnel.tsx` (line 767) writes via the anon client. Insert silently fails for non-platform users; for platform users it works only because they pass the policy — but the failure is swallowed (`console.warn`). No telemetry, no toast.
- Fix: surface error to the user (`toast.error`) and add an explicit `is_platform_user` check before render, OR move the insert into a tiny edge function (`log-setup-outreach`) so the contract is enforced server-side. Doctrine: multi-tenant-isolation-and-hardening.

### 3. `UnfinishedFromSetupCallout` uses `window.location.href` for deep links
Line 64: `window.location.href = row.deep_link`. Violates the **Routing Core rule** (`window.location.href is prohibited`, must use `dashPath()` + client-side nav). Causes a hard reload, drops React Query cache, breaks the multi-tenant slug context.
- Fix: route through `useNavigate()` and `useOrgDashboardPath()` if `deep_link` is relative, or whitelist absolute external URLs only. Doctrine: multi-tenant-url-hierarchy.

### 4. Backfill never ran on the only candidate org
DB check: `org_setup_commit_log` is empty, `signup_source` shows 1 `migrated` org. The trigger requires `setup_completed_at IS NULL` AND ≥1 active location, and stores an attempt key in `localStorage`. Since `useBackfillTrigger` only ever fires once per browser per org and silently bails, we can't tell if eligibility was met or if the legacy migrated org was filtered out.
- Fix: add a `org_setup_backfill_attempts` table (server-side ledger) so we can audit. Add a platform tool to "Force backfill org X" for debugging.

---

## P1 — Behavioral bugs

### 5. Sparkline buckets drops by **view** time, not **drop** time
`SetupFunnel.tsx:301` uses `viewedAt` (when the org first viewed the step) to place into the 8-week bucket. A user who viewed step 5 nine weeks ago and bailed last Tuesday is invisible on the trend. The trend chart describes when interest happened, not when abandonment happened.
- Fix: bucket by `lastActivityByOrg.get(id)` (most recent touch), with `viewedAt` only as the floor. Recompute `weeklyDrops`.

### 6. `setup_followup_queue` resets the 48h timer on every dismissal
`enqueue-setup-followup/index.ts:62` upserts with `scheduled_for = now + 48h` regardless of existing row state. A user who X's the banner twice in 47 hours pushes the nudge out 4 days. Worse: if a nudge already sent (`sent_at` set), the upsert overwrites `sent_at: null` and we re-nudge.
- Fix: `INSERT ... ON CONFLICT DO NOTHING WHERE sent_at IS NULL`, OR fetch first and only reschedule if the existing row is unsent.

### 7. Source-mix tile counts only orgs that touched setup, mislabels "attribution health"
`sourceBreakdown` (line 336) uses event-touched orgs as denominator. Cohort filter says "All sources" but the % shown is "% of dropouts/walkers by source", not "% of org base by source". Misreads as marketing attribution health.
- Fix: query `organizations` count grouped by `signup_source` directly for the tile; keep the events-driven version only when a source filter is active.

### 8. Commit log "completed" semantics drift between paths
- `commit-org-setup` writes `status='completed'` after wizard finish.
- `backfill-org-setup` writes `status='completed'` for synthetic backfills with `reason='Inferred from existing data'`.
- `process-setup-followups` and `BackfillWelcomeBanner` both treat `latest.get(s) === 'completed'` as "done" regardless of source.

A backfilled org will be considered "intent done" even though intent was explicitly marked `pending_intent` and never written. This works today only because backfill never writes intent/apps — but the contract is fragile.
- Fix: differentiate via a `source` column on commit log (`wizard | backfill | api`), OR require a non-null `attempted_by` user for "true" completion.

### 9. Process-followups never validates org still exists / user still admin
If the org was deleted or the user lost admin between enqueue and the nudge (48h+ later), the function still tries to dispatch. Notification metadata leaks org names from deleted accounts.
- Fix: re-check `is_org_admin` and org existence before dispatch; mark `skipped_reason='org_deleted'` or `'no_longer_admin'`.

### 10. `dismissBackfillBanner` permanent dismiss never gets called
Wave 5 added auto-dismiss-on-completion in the banner's effect, but `snoozeBackfillBanner` is called for both X-button AND Review CTA. The only path to the permanent `{ shown: true }` state is when `intentAndAppsDone` becomes true after the banner is currently visible. A user who completes intent + apps in the wizard without re-mounting the banner never marks it dismissed → banner reappears 24h later asking them to do work that's already done.
- Fix: when the user completes the final `commit-org-setup` step, fire `dismissBackfillBanner` from the success handler.

---

## P2 — Architectural & polish

### 11. Banner `localStorage` keying breaks on browser switch
Snooze + attempt state is per-browser, not per-user. User who switches from Chrome to Safari sees the banner again, gets re-backfilled (idempotent server-side, but extra work and re-nudges).
- Fix: mirror state in a `org_setup_user_state` table (user_id, org_id, snoozed_until, dismissed_at).

### 12. Funnel CSV doesn't include step recency or trend snapshot
Currently exports id/name/source/last_activity/days. Outreach campaigns also need: which step they last completed, total steps completed, and weekly trend bucket — so ops can write source + stage-aware copy.
- Enhancement: add `completed_steps` and `last_step_completed` columns.

### 13. Source-aware copy doesn't handle `invited`
`pickFollowupCopy` in `process-setup-followups` falls through `invited` to the default. Invited operators have a different mental model (somebody set this up for me) — copy should reference the inviter.
- Fix: add explicit `invited` case + thread `invited_by_name` through the queue row.

### 14. No backfill rollback / "I didn't sign up for this" path
Once we infer step 1–6 and stamp `signup_source: backfilled`, there's no UI to say "actually clear what you guessed and let me start fresh". Important for orgs whose existing data is stale.
- Enhancement: add a "Restart setup from scratch" button in admin settings → wipes drafts, clears synthetic commit log, resets signup_source.

### 15. Funnel tile uses 5-column grid that drops to 1 column on tablet
`grid-cols-1 md:grid-cols-2 xl:grid-cols-5` — at 1024–1279px we get 2 cols → ugly orphan. Container-aware doctrine wants `lg:grid-cols-3 xl:grid-cols-5`.

### 16. Sparkline has no hover interaction
Users can't see exact weekly counts. No delta-vs-prior-period indicator. Easy win for "spot regressions after copy changes" use case.
- Enhancement: add tooltip on hover, render delta arrow `↑3` / `↓1` next to current week.

### 17. Source badge in source-mix tile isn't clickable
Wave 10 enhancement floated this. One click on a `SourceBadge` in the breakdown tile should set `source` filter to that key. Currently dead text.

### 18. No platform-level alert when funnel rate craters
We have a sparkline but no monitoring. If completion rate drops 30% week-over-week, platform ops finds out by manually opening the page.
- Enhancement: weekly digest job comparing this week's rate to 4-week trailing avg, posts to platform notifications channel when delta exceeds threshold (alert-governance throttling applies).

### 19. `process-setup-followups` cooldown of 7 days max one nudge per week
Only one nudge ever sent (sent_at is set, the row is done). Doc says "one nudge per week max" but the queue is single-shot. Either docs are wrong or we need a re-enqueue path after first nudge.
- Clarify: either remove the misleading `cooldownMinutes` comment, or implement nudge #2 at +7d if still pending.

### 20. Two CSV exports can race-write the same outreach rows
Two platform admins exporting the same step within seconds both insert outreach rows. No unique constraint on (organization_id, step_number, exported_at::date) → cooldown logic still works (uses max), but log is noisy.
- Fix: add a partial unique index on (organization_id, step_number) where exported_at > now() - 7d, OR use `ON CONFLICT DO NOTHING`.

---

## Doctrine compliance check

| Rule | Status |
|---|---|
| `dashPath()` mandatory | **Violated** in UnfinishedFromSetupCallout (#3) |
| `BlurredAmount` for $ values | N/A — no monetary surfaces in this build |
| Tenant isolation `organization_id` | OK throughout |
| `USING (true)` prohibited | OK |
| Termina headlines, Aeonik body | OK in BackfillWelcomeBanner + SetupFunnel |
| Loader unification | OK (uses `Skeleton`) |
| Container-aware responsiveness | Minor gap (#15) |
| Visibility contracts (silence valid) | OK — UnfinishedFromSetupCallout returns null when clean |
| Drawer canon (`PremiumFloatingPanel`) | N/A |

---

## Recommended fix order
1. **Wave 11A (P0 sweep)** — items #1, #2, #3, #4: cron auth, RLS+toast, routing fix, backfill audit ledger.
2. **Wave 11B (semantic correctness)** — items #5, #6, #8, #10: drop-bucket fix, dedupe enqueue, commit log source column, success-path dismiss.
3. **Wave 11C (polish & enhancements)** — items #7, #9, #11–#20 grouped by surface area.

---

## Technical notes
- `verify_jwt` defaults to `false` for Lovable-managed functions; double-check `_shared/cors.ts` deploy config since cron tries to send a Bearer.
- `app.settings.service_role_key` is a Supabase platform setting that must be set via `ALTER DATABASE postgres SET ...` (forbidden by guidelines). Use the service-role client inside the function instead.
- Adding a `source` column to `org_setup_commit_log` is a non-breaking migration; backfill existing rows: `wizard` if `attempted_by IS NOT NULL` and `reason NOT LIKE 'Inferred%'`, else `backfill`.

