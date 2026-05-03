# Gate Zura Reputation as a paid app

## Feedback on the prompt
Strong framing — you scoped it to two layers (the dashboard app + the website wire-through) and asked the open-ended "what else." That's the right shape for a gating question. To sharpen further next time: (1) name the **billing model** up front (flat monthly vs per-location vs metered review-sends — they fan out to very different schemas), (2) state the **trial posture** (free trial? grandfathering for existing pilot orgs?), and (3) declare the **degraded-state contract** (what happens to already-published testimonials when a sub lapses — hide, watermark, or grace period?). Those three answers collapse ~80% of the implementation forks.

## What's already in place

- **Entitlement pattern is established.** `useConnectEntitlement` + `useColorBarEntitlement` both read `organization_feature_flags` by `flag_key`. Adding `reputation_enabled` follows the exact same shape — no new infra.
- **App is already cataloged.** `src/pages/dashboard/AppsMarketplace.tsx` line 118 has the `reputation` card (currently "Coming Soon" per the screenshot).
- **Reputation surfaces exist and are unsubscribed-aware-able.** Hubs that touch reviews: Operations Hub (Feedback Hub), `useFeedbackThemes` (AI tagger), `StylistReputationCard`, `NegativeFeedbackThemes`, `RecoveryOutcomeCard`, `ComplianceBanner`, `useStylistReputation`.
- **Website wire-through point is single-source.** `ZuraReviewLibrary` (drawer inside `TestimonialsEditor`) is the only path that promotes a `client_feedback_responses` row into a `website_testimonials` row. The public site (`TestimonialSection.tsx`) reads `website_testimonials` directly — so gating happens at curation, not at render.

## Plan

### 1. Database — entitlement + audit
Migration adds:
- `reputation_enabled` flag convention in `organization_feature_flags` (no schema change — same table as Connect/Color Bar).
- `reputation_subscriptions` table: `organization_id`, `status` (`trialing|active|past_due|canceled`), `started_at`, `current_period_end`, `canceled_at`, `stripe_subscription_id` (nullable for manual/God Mode grants), `grant_source` (`stripe|platform_grant|trial`).
- DB trigger: when `reputation_subscriptions.status` flips to `active|trialing`, upsert `organization_feature_flags{reputation_enabled:true}`; when it flips to `canceled|past_due` past grace, set false. Single source of truth = subscription row; flag is a denormalized read cache (matches Connect pattern).
- RLS: org-scoped via `is_org_admin` for writes, `is_org_member` for reads.

### 2. Entitlement hook
Create `src/hooks/reputation/useReputationEntitlement.ts` mirroring `useConnectEntitlement` exactly — reads `reputation_enabled` flag, 60s staleTime, fallback org resolution.

### 3. Dashboard gating (the Reputation app surface)
Wrap entry points with the entitlement check:
- **Operations Hub → Feedback Hub card**: render a locked variant when `!isEntitled` (lock icon + "Upgrade to Zura Reputation" CTA → routes to `/dashboard/apps?app=reputation`).
- **`FeedbackHub.tsx` page**: top-level gate — if not entitled, render `ConfigurationStubCard` variant with subscribe CTA instead of the dashboards (recovery queues, theme tagger, NPS).
- **`StylistReputationCard`** (stylist self-view): hide via `VisibilityGate` when org lacks entitlement (stylists shouldn't see paywall — silence is valid output per doctrine).
- **AI theme tagger edge function** (`ai-feedback-theme-tagger`): add server-side entitlement check before invoking model — prevents bypass via direct function call. Uses service-role client + reads the flag.

### 4. Website wire-through gating
This is the leverage point you asked about. Three enforcement layers:

**a. Curation gate (UX layer)** — `TestimonialsEditor.tsx`: hide the "Open Zura Review Library" button when `!isEntitled`; replace with "Upgrade to auto-curate 5-star reviews" inline upsell. Source mode dropdown loses `mixed` and `auto` options; falls back to `manual`.

**b. Mutation gate (API layer)** — `useCurateReview`, `useFeatureReview`, `useUpdateDisplayCopy`, `useUnpublishReview`, `useHideReview`: pre-flight entitlement check before the mutation; throws if not entitled. Defense-in-depth against direct devtools calls.

**c. Render gate (degraded-state contract)** — when subscription lapses, `website_testimonials` rows with `source = 'zura_review'` need a contract. **Recommended**: 30-day grace where they keep rendering, then auto-hide (`published = false`) via a scheduled function, leaving manual testimonials untouched. Operator gets a Reputation lapse notification (uses Alert Governance throttling). Re-subscribing flips them back automatically.

### 5. Subscription lifecycle (Stripe)
- Add `reputation` to the existing Stripe billing flow (same pattern as Color Bar / Connect). New product + price in Stripe; webhook updates `reputation_subscriptions.status`.
- Marketplace card swaps "Notify Me" → "Subscribe" when entitled-org-admin views it; "Manage Subscription" when already active.
- God Mode override path exists (per God Mode Governance memory) — platform grant writes a `reputation_subscriptions` row with `grant_source='platform_grant'`.

### 6. Tests
- `useReputationEntitlement.test.ts` — flag resolution + fallback org.
- `ReputationGate.test.tsx` — Feedback Hub renders stub when unentitled.
- `ZuraReviewLibrary.entitlement.test.tsx` — library button hidden, mutation hooks throw.
- `reputation_subscription_trigger.sql` test — status flip propagates to flag.
- Edge function entitlement check covered in `ai-feedback-theme-tagger.test.ts`.

## What else to consider (the open-ended half)

1. **Trial economics.** A 14-day trial on Reputation makes sense because the value (5-star curation) compounds over weeks, not days. Without a trial, conversion is hard — operators can't see the wire-through magic until reviews flow in.

2. **Per-location vs per-org pricing.** Multi-location orgs scale review volume linearly. Current Color Bar model is per-location. Recommend matching — otherwise enterprise orgs underpay and Stripe MRR doesn't track reality.

3. **Already-collected reviews.** You likely have `client_feedback_responses` from pre-gate pilot use. Decision: do those become "free" assets a non-subscriber can still curate? Recommend **no** — gate is on the *curation action*, not on review collection (collection should stay on so churn-back is low-friction).

4. **Stylist Privacy Contract intersection.** `StylistReputationCard` is on the stylist allowlist. When org is unentitled, the card should disappear silently from the stylist dashboard — do *not* show stylists a paywall (they can't act on it; surfaces a manager problem to a non-manager).

5. **Public site SEO impact on lapse.** If reputation lapses and 50 testimonials disappear from the public site, that's a measurable SEO/conversion hit. The 30-day grace + warning notification is the mitigation, but worth surfacing in the cancel-confirmation modal: "30 curated reviews will be hidden in 30 days."

6. **Compliance carryover.** `ComplianceBanner` enforces SMS opt-out / review request frequency caps (per Reputation Engine memory). If a non-subscriber is no longer sending review requests, the banner should self-suppress — don't nag operators about a system they aren't using.

7. **Platform observability.** Add `reputation_subscription_status` to platform admin dashboards (alongside Color Bar / Connect rollout views) so internal team sees adoption, churn, and grace-period orgs.

8. **AI cost control.** The theme tagger uses Lovable AI credits. Gating it behind subscription naturally caps spend — but consider also rate-limiting per org (current code requires ≥5 negatives, which helps, but no daily cap exists).

## Files to create
- `supabase/migrations/<ts>_reputation_subscription.sql`
- `src/hooks/reputation/useReputationEntitlement.ts`
- `src/hooks/reputation/useReputationSubscription.ts` (Stripe checkout + portal)
- `src/components/reputation/ReputationGate.tsx` (locked-state stub)
- Tests above

## Files to edit
- `src/pages/dashboard/AppsMarketplace.tsx` — wire subscribe CTA
- `src/pages/dashboard/admin/FeedbackHub.tsx` — top-level gate
- `src/pages/dashboard/admin/TeamHub.tsx` (Operations Hub) — locked-card variant
- `src/components/dashboard/website-editor/TestimonialsEditor.tsx` — hide library button
- `src/hooks/useEligibleReviews.ts` — pre-flight checks on all 5 mutations
- `src/components/feedback/StylistReputationCard.tsx` — wrap in `VisibilityGate`
- `supabase/functions/ai-feedback-theme-tagger/index.ts` — server-side entitlement check
