

# SEO Task Engine — Final Audit Against Original Specification

## Audit Method
Every requirement from the original plan was cross-referenced against the current codebase: config files, lib functions, edge functions, UI components, hooks, and integration points.

---

## What Is Fully Implemented

The following areas from the original plan are complete and working:

**Config Layer** — All 8 config files exist and are correct:
- 6 health domains with signal keys, 22 problem types mapped to templates, 16 task templates with deterministic fields, assignment rules with fallback chains, state machine with valid transitions, quotas with period/target logic, priority scoring model with 6 weighted factors.

**Lib Layer** — All 8 lib modules exist and export correctly:
- Priority calculator, assignment resolver, suppression engine, completion validator (per-template switch with system vs manual paths), dependency resolver (hard/soft), impact tracker (contribution-confidence model with 7d/30d/90d windows), effectiveness tracker (opportunity/ease modifiers), campaign bundle generator, bootstrap campaign generator (5-phase sequencing with dependency ordering).

**Edge Functions** — All 4 scan functions exist:
- `seo-score-calculator`: Registers SEO objects (location, service, location-service, website_page, stylist_page), computes per-domain health scores, computes opportunity/risk scores. Auth-protected.
- `seo-daily-scan`: Overdue escalation (3-level), review opportunity detection from appointments (with communication eligibility filter), photo freshness detection. History records on all paths.
- `seo-weekly-scan`: Page issues, content gaps, conversion weakness, competitor gap stub. History records on all paths.
- `seo-monthly-scan`: Task effectiveness measurement (30-day impact), campaign health evaluation, suppressed task cleanup, strategic reprioritization.

**UI Layer** — SEO Workshop hub with 7 tabs (Dashboard, Tasks, Campaigns, Objects, Settings, Guides, Tools). Task detail dialog with proof upload, state transitions, completion validation. Campaign detail dialog. Bootstrap dialog. Manual task creation dialog. Dashboard health summary with color-coded bars.

**Integration Components** — 4 cross-system cards exist:
- `SEOInsightsCard` → wired into LeadershipTabContent
- `SEOUnifiedTasksCard` → wired into ManagementHub
- `SEOContentTasksCard` → wired into MarketingAnalytics (with AI draft generation)
- `SEOPageHealthBadge` → exists but NOT wired into Website Builder

**Data Layer** — Tables exist: `seo_objects`, `seo_health_scores`, `seo_opportunity_risk_scores`, `seo_tasks`, `seo_task_templates`, `seo_task_history`, `seo_task_impact`, `seo_campaigns`, `seo_task_dependencies`. RLS policies in place. Template seeding confirmed.

---

## Remaining Gaps (Ordered by Impact)

### GAP 1: SEOPageHealthBadge not wired into Website Builder
**Severity**: Medium — Original plan says "Inside the Website Builder, expose Page Health with fix suggestions and one-click guided tasks." The component exists with fix buttons but is imported nowhere in the website builder pages (`WebsiteHub.tsx`, `WebsiteSectionsHub.tsx`, or page editor views).
**Fix**: Import `SEOPageHealthBadge` into the website page editor or pages hub, passing each page's SEO object ID.

### GAP 2: Escalation does not send notifications
**Severity**: Medium — Original plan requires: "If overdue by 1 day: Notify assignee. If overdue by 3 days: Notify fallback manager. If overdue by 5 days and high priority: Escalate to owner and surface in Insights as blocked growth." The daily scan escalates status and records history, but sends zero notifications. No call to any notification edge function or in-app notification system.
**Fix**: After escalation state change, insert into the existing notification system (in-app notifications table or send-push-notification function) targeting the assignee, then fallback manager at level 2, then owner at level 3.

### GAP 3: Dependency logic exists but is never invoked
**Severity**: Medium — `checkDependencies()` and `seo_task_dependencies` table exist, but no scan function, bootstrap dialog, or task transition ever queries dependencies or calls `checkDependencies()`. Bootstrap generates tasks with `dependsOn` arrays but never inserts rows into `seo_task_dependencies`. The task detail dialog allows state transitions without dependency checks.
**Fix**: (a) Bootstrap dialog should insert `seo_task_dependencies` rows when creating tasks. (b) `transitionTaskStatus()` should check dependencies before allowing `assigned → in_progress`. (c) Scan functions should check dependencies before generating promotion tasks.

### GAP 4: No stylist/front-desk role-filtered dashboards
**Severity**: Low-Medium — Original plan says: "Inside stylist or front-desk dashboards, show only role-appropriate actions: Request reviews, Upload photos, Submit proof, Complete content requests. Do not expose the entire SEO complexity to everyone." Currently SEO surfaces only appear in admin-level pages (ManagementHub, MarketingAnalytics, LeadershipTab). No stylist-facing or front-desk-facing SEO task views exist.
**Fix**: Add a lightweight `SEOMyTasksCard` component to stylist/front-desk dashboard pages showing only tasks assigned to the current user, filtered by role-appropriate template types.

### GAP 5: Scan functions accept arbitrary `organizationId` without auth validation
**Severity**: Medium (Security) — Daily, weekly, monthly scans create a service-role client and accept `organizationId` from the request body. Any authenticated user calling `supabase.functions.invoke('seo-daily-scan', { body: { organizationId: 'any-org' } })` can trigger scans for organizations they don't belong to. Only `seo-score-calculator` validates org membership.
**Fix**: Add JWT validation + org membership check when the request includes an auth header. Keep unauthenticated path for cron-triggered calls (no auth header = process all orgs).

### GAP 6: Admin configuration layer missing
**Severity**: Low-Medium — Original plan specifies configurable settings: "Target services by location, review cadence targets, GBP posting cadence targets, photo freshness targets, preferred assignee by task type, cooldown windows, task load cap per user, strategic keyword themes, priority services, campaign aggressiveness level." Currently all values are hardcoded in config files and edge functions. No org-level settings table or UI for tuning these values.
**Fix**: Create an `seo_engine_settings` table with org-scoped key-value pairs. Add a settings form in the SEOEngineSettings tab. Have scan functions read org settings before using defaults.

### GAP 7: Review task logic doesn't cross-reference health scores for deficit targeting
**Severity**: Low — Original plan says: "Filter by service type against location SEO deficits." The daily scan generates review tasks from recent appointments but doesn't check the location-service's review health score to prioritize deficit areas (e.g., services with low review velocity get priority over already-healthy ones).
**Fix**: After grouping appointments by location-service, fetch the review health score for each pair and sort by deficit (lowest score first). Generate tasks for the most-needed pairs first.

### GAP 8: GBP posting gap detection missing from daily scan
**Severity**: Low — Original plan lists "GBP posting gaps" as a daily scan item. The daily scan only handles escalation, review opportunities, and photo freshness. GBP posting cadence is not checked.
**Fix**: Add a `detectGBPPostingGaps()` function to the daily scan that checks `local_presence` health scores for low `gbp_post_cadence_days` signals and generates `gbp_post` tasks.

### GAP 9: Review response tasks not auto-generated
**Severity**: Low — Original plan says review response tasks should be generated when reviews are published and awaiting response. No scan function detects unresponded reviews or generates `review_response` tasks. The problem type `unresponded_reviews` exists in config but is never triggered by any scan.
**Fix**: Requires a review data source. Add a stub in the daily scan that checks for review data and generates response tasks when reviews are > 48 hours old without a response.

### GAP 10: No "likely-to-respond" scoring for review candidates
**Severity**: Low — Original plan mentions: "Likely responder score above threshold" and "AI may help rank likelihood-to-respond." Current logic selects all eligible appointments equally without ranking. This is acceptable as a Phase 2 enhancement but worth noting.

---

## Implementation Plan

| Priority | Gap | Files | Effort |
|---|---|---|---|
| 1 | **GAP 5** — Auth validation on scan functions | `seo-daily-scan`, `seo-weekly-scan`, `seo-monthly-scan` | Small |
| 2 | **GAP 3** — Wire dependency logic into bootstrap + transitions | `SEOBootstrapDialog.tsx`, `seo-task-service.ts` | Medium |
| 3 | **GAP 2** — Escalation notifications | `seo-daily-scan/index.ts` | Small |
| 4 | **GAP 1** — Wire SEOPageHealthBadge into Website Builder | Website page editor component | Small |
| 5 | **GAP 4** — Role-filtered SEO task view for stylists | New `SEOMyTasksCard.tsx` + stylist dashboard | Medium |
| 6 | **GAP 8** — GBP posting gap detection | `seo-daily-scan/index.ts` | Small |
| 7 | **GAP 6** — Admin configuration layer | New table + settings UI | Medium |
| 8 | **GAP 7** — Deficit-targeted review generation | `seo-daily-scan/index.ts` | Small |
| 9 | **GAP 9** — Review response task generation stub | `seo-daily-scan/index.ts` | Small |

Total: ~6 files modified, 1 new component, 1 potential new migration (GAP 6 only).

GAP 10 (likely-to-respond scoring) is Phase 2+ and not actionable now.

---

## Assessment

The SEO Task Engine is **~90% complete** against the original specification. The core architecture — deterministic detection, template-based generation, role-based assignment, state machine, suppression, completion validation, impact tracking, campaign bundling, bootstrap, and cross-system integration — is all built and structurally sound. The remaining gaps are operational refinements (notifications, dependency enforcement, auth hardening, role-filtered views) rather than architectural omissions.

