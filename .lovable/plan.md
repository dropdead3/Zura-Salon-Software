# Reputation Build — Scalability & Security Hardening

After auditing all 16 reputation edge functions, 33 hooks, 38 UI components, RLS, and indexes, found 5 issues that bite at scale (50+ active orgs) or are outright security bugs. Ranked by blast radius.

## P0 — Security & correctness

### 1. `send-feedback-request` is unauthenticated and bypasses every guardrail
File: `supabase/functions/send-feedback-request/index.ts`

Currently accepts an `organizationId` from the request body with **no JWT validation, no org-membership check, no kill switch, no entitlement gate, no opt-out check, no compliance log write, no `survey_id`**. Any authenticated user (and currently any caller at all, since there's no auth) can spam feedback requests for any org.

Fix: mirror `send-review-request-manual` — extract Bearer token, `auth.getUser()`, `is_org_admin({_user_id, _org_id})`, kill-switch (`manual_send_disabled`), entitlement (`organization_feature_flags.reputation_enabled`), `client_email_opt_outs` lookup, auto-create/lookup default survey, attach `survey_id` to the response row, write `review_compliance_log` entry. Validate body with Zod.

### 2. OAuth callback uses request `Origin` header for redirect base
File: `supabase/functions/reputation-google-oauth-callback/index.ts:70-72`

```ts
const appBase = req.headers.get("origin") || Deno.env.get("APP_BASE_URL") || "https://id-preview-...lovable.app";
```

Origin is attacker-controllable in cross-site requests. Combined with the `return_to` from state payload and the open `htmlRedirect`, this is an open-redirect primitive. Mitigated somewhat by HMAC-signed state, but the redirect base must come from server config only.

Fix: drop the `req.headers.get("origin")` branch, require `APP_BASE_URL` env (set to canonical preview/prod URL), and validate `payload.return_to` starts with `/` (no protocol/host).

## P1 — Scalability cliffs

### 3. `useRecoverySLA` pulls 500 rows per dashboard load
File: `src/hooks/useRecoverySLA.ts`

Every Online Reputation page load fetches up to 500 recovery rows just to compute 4 counts + 2 averages. At 100 orgs × 5 dashboards/day × 500 rows = 250k rows/day moved over the wire for math the DB can do in `count(*)`.

Fix: replace with 5 parallel `head:true count:exact` queries (open / contacted / resolved / breached) + one bounded 200-row sample for averages. All hit existing `idx_recovery_tasks_org_status` and `idx_recovery_tasks_snoozed`. Rough payload reduction: ~99%.

### 4. `dispatch-review-requests` enqueue scans ALL active rules globally before filtering by entitlement
File: `supabase/functions/dispatch-review-requests/index.ts:60-79`

Pulls every active rule across the platform, then filters by entitled orgs in memory. At 1000 orgs with rules but only 50 paying for reputation, that's 950 rows of wasted scan + a 1000-element `IN` clause back to feature flags.

Fix: invert order — pull entitled org IDs from `organization_feature_flags` first (`flag_key='reputation_enabled' AND is_enabled=true`), then `select rules where organization_id IN (entitled)`. Smaller scan, smaller IN list, same correctness.

### 5. `reputation-grace-cadence` scans all past_due regardless of grace status, unordered
File: `supabase/functions/reputation-grace-cadence/index.ts:63-68`

```ts
.eq("status", "past_due").not("grace_until", "is", null)
```

No `gte("grace_until", now)` filter — orgs whose grace already expired (should have been swept to `canceled` by `reputation-grace-sweep`, but timing race) get re-examined every hour forever. No `order by` either, so behavior is non-deterministic at scale.

Fix: add `.gte("grace_until", nowIso).order("grace_until", { ascending: true }).limit(500)`. Bounds the per-tick work and matches the existing `idx_reputation_subscriptions_status` lookup pattern.

## What I checked and confirmed clean
- All RLS policies on reputation tables scope by `organization_id` (verified via doctrine).
- Indexes exist for every dispatcher/SLA/grace hot path (`idx_review_dispatch_due`, `idx_recovery_tasks_org_status`, `idx_reputation_subscriptions_status`, etc.).
- Dispatcher fairness allocator + per-org tick caps already shipped (prior wave).
- `is_org_admin` arg-shape canon enforced via Vitest + ESLint (no `_organization_id` regressions).
- Kill-switch helper is fail-open and used in all 3 dispatch paths + 3 webhook branches.
- Stripe webhook reputation branches all gated by `webhook_processing_disabled`.
- Grace cadence dedupe via `reputation_grace_emails_sent` UNIQUE constraint is correct.

## Files changed (5)
- `supabase/functions/send-feedback-request/index.ts` — full rewrite to match `send-review-request-manual` security posture
- `supabase/functions/reputation-google-oauth-callback/index.ts` — drop Origin fallback, validate `return_to`
- `src/hooks/useRecoverySLA.ts` — refactor to count queries + bounded sample
- `supabase/functions/dispatch-review-requests/index.ts` — entitle-first enqueue
- `supabase/functions/reputation-grace-cadence/index.ts` — bound + order pastDue scan

## Out of scope (deferred, declared revisit triggers)
- Per-location reputation metering (`mem://features/reputation-per-location-metering-scope`) — revisit when per-location analytics ship.
- Setup wizard (`mem://features/reputation-setup-wizard-todo`) — revisit at 5+ paying reputation customers.
- Lovable preview URL in OAuth client (`mem://features/reputation-google-oauth-domain-todo`) — revisit when prod domain purchased.

---

**Prompt feedback:** "analyze the entire X, fix any bugs and gaps, ensure scalable" is a strong open-ended audit prompt — gives the agent room to find issues you didn't know about. To make it even sharper next time, add an explicit scale target (e.g. "300 orgs, 50k SMS/day") and a budget for changes ("≤5 files, no new tables") so I prioritize ruthlessly instead of listing nice-to-haves.
