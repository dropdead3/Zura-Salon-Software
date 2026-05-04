# Location Filtering for Zura Reputation

Add a header-level location filter to `/admin/feedback` so multi-location operators can scope every review, NPS, recovery, and intelligence surface to one or more locations.

## Why this is non-trivial

`client_feedback_responses` has **no `location_id` column today** — it only carries `appointment_id` and `staff_user_id`. Filtering through a join on every read (15+ surfaces) is slow, fights RLS, and breaks the public response token endpoint. We need to denormalize `location_id` onto the response row, backfill historical data, and keep it in sync going forward. `recovery_tasks` already has `location_id` so no schema change there.

## Schema migration

1. `ALTER TABLE client_feedback_responses ADD COLUMN location_id text REFERENCES locations(id) ON DELETE SET NULL;`
2. `CREATE INDEX idx_cfr_org_location_responded ON client_feedback_responses(organization_id, location_id, responded_at DESC);`
3. Backfill: `UPDATE client_feedback_responses r SET location_id = a.location_id FROM appointments a WHERE r.appointment_id = a.id AND r.location_id IS NULL;`
4. Trigger `set_feedback_response_location` BEFORE INSERT — when `location_id` is null and `appointment_id` is set, populate from `appointments.location_id`. Keeps the survey-creation edge function and any future ingestion paths honest.
5. RLS: existing `is_org_member`/`is_org_admin` policies remain unchanged (org-scoped). Public token-based read policy unaffected (token, not location).

## Frontend architecture

### Header filter

Reuse the existing `LocationMultiSelect` / `LocationSelect` pattern from `AnalyticsFilterBar`:

- Add a single filter row directly under the page header (above the subscription card), right-aligned next to `ReputationGlossary`.
- Selection persists via `?location=<id>` (or comma-list) URL param so deep-links/back-button survive — same convention as analytics filters.
- Account-owner / admin sees all locations. Stylists see read-only single-location badge (Stylist Privacy Contract — they can't pivot org-wide; this filter must respect their accessible-locations scope).
- `'all'` = aggregate (only when `canViewAggregate`).

### Context propagation

Introduce a tiny `ReputationFilterContext` (`{ locationId: string }`) at `FeedbackHub` so we don't drill props through 18 children. Hooks read it via `useReputationFilter()`.

```text
FeedbackHub (filter state + URL sync)
  └── ReputationFilterProvider
        ├── Overview cards
        ├── Reviews tab (ReviewsTable)
        ├── Presence tab
        ├── Intelligence tab
        └── Settings (filter hidden)
```

### Hook updates (add `locationId` arg, append `.eq('location_id', …)` when set)

- `useReviewVelocity` · `useNPSAnalytics` · `useReviewFunnel` · `useRecoverySLA` · `useRecoveryTasks` · `useEligibleReviews` · `useFeedbackTrendDrift` · `useNegativeReviewHeatmap` (already location-aware) · `useServiceSatisfaction` · `useStylistReputation` · `usePraiseWall` · `useReviewThreshold`
- All queryKeys gain `locationId` so React Query caches per-location.
- When `locationId === 'all'`, omit the filter (preserves current behavior).

### Components

- `ReviewsTable` — accept `locationId`, pass through to its query, show active filter badge.
- `NPSScoreCard`, `RecoverySLAWidget`, `ReviewVelocityCard`, `ReviewFunnelCards`, `TodaysMustTouchStrip`, `AutoBoostTelemetryCard`, `AIWeeklyFeedbackSummary`, `NegativeFeedbackThemes`, `FeedbackTrendDriftCard`, `CoachingLoopCard`, `StylistReputationCard`, `ServiceSatisfactionBriefCard`, `PraiseWall`, `RecoveryOutcomeCard`, `ParkedDispatchCard` — read `locationId` from context, no prop drilling.
- Settings tab: hide the filter (settings are org-scoped). Online Presence tab: filter is meaningful (review-link overrides are per-location); show it.

### Edge functions

Audit and patch any reputation edge functions that aggregate stats (e.g. weekly summary cron, recovery dispatch) — they iterate org-wide and don't need filtering, so no changes. The new column will simply flow through future analytics.

## Settings hint

Add a small inline note in **Settings → Locations** explaining that per-location review links + the new location filter unlock per-store reputation reporting (drives adoption of `location_review_settings`).

## QA / regression

- New Vitest: `useReviewVelocity` honors `locationId` filter and cache key.
- Existing Stylist Privacy Contract test extended: stylist role must not see `'all'` option.
- Manual: switch between locations on Overview, Reviews, Intelligence — confirm card counts update; verify URL deep-link works.

## Out of scope (deferred — note in memory)

- Per-location reputation **billing/metering** (already deferred per `mem://features/reputation-per-location-metering-scope`). This work just unblocks the analytics signal; pricing tier change stays gated on its existing trigger.

## Memory updates

- Append filter contract to `mem://features/reputation-engine.md`: "Location filter scopes via denormalized `client_feedback_responses.location_id` (BEFORE INSERT trigger from `appointments.location_id`); all reputation hooks accept `locationId` and key React Query caches by it; stylist role is single-location only."
