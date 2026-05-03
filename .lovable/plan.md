## Plan: Memory Updates + Test Pass

### 1. Memory updates
Update `mem://features/reputation-subscription-gating` to document the three new layers shipped this session:
- **Grace banner**: `ReputationGraceBanner` mounted in `DashboardLayout`, surfaces `past_due` countdown with curated-review-at-risk count. Global (not Feedback Hub-scoped) so operators see it before the 30-day clock burns.
- **Transactional grace email**: `stripe-webhook` sends `reputation-grace-warning` on `customer.subscription.updated → past_due` and `customer.subscription.deleted` (start of 30-day window). Email body dynamically lists curated review count to anchor SEO impact. Idempotency keyed off subscription event ID.
- **Retention save offer**: Stripe coupon `l1tzNWQq` ($20 off × 3mo). `reputation-retention-coupon` edge fn applies it once per org (gated by `reputation_subscriptions.retention_coupon_applied_at` timestamp added in migration `20260503053623_*`). UI exposes it as a "Save Offer" CTA in `ReputationSubscriptionCard` BEFORE the customer-portal cancel CTA — operators see retention before churn flow.
- **Customer portal**: `reputation-customer-portal` edge fn opens Stripe Billing Portal (self-serve cancel/update card) from inside Feedback Hub, eliminating the email-receipt round-trip.

Update Core index entry (`Reputation Subscription Gating`) to mention: 30-day grace via past_due → grace_until → hourly sweep, retention coupon applied once per org, global grace banner, customer portal.

Add Deferral Register entry for **per-location reputation metering** — defer until multi-location reputation analytics ship; target model: $49 first location + $19 each additional location, billed as quantity on the same Stripe subscription. Revisit trigger: per-location reputation analytics shipping.

### 2. Smoke test pass
Read-only sanity checks (no DB writes):
- `supabase--read_query` to confirm `retention_coupon_applied_at` column exists on `reputation_subscriptions` and the table has the expected new shape.
- `supabase--read_query` to verify the `sync_reputation_entitlement` trigger still fires correctly post-migration (inspect `pg_trigger`).
- `supabase--deploy_edge_functions` for the three new/edited functions: `reputation-customer-portal`, `reputation-retention-coupon`, `stripe-webhook` — surface any deploy errors.
- `supabase--edge_function_logs` on `stripe-webhook` to confirm no parse/import errors after the grace-email branch was added.
- Lint check on `ReputationGraceBanner.tsx` and `ReputationSubscriptionCard.tsx` via the standard build pipeline (automatic on next change).

### 3. Out of scope (explicitly deferred)
- Wiring Stripe Billing Portal **configuration** (custom cancellation reason survey, retention coupon offer rendered inside the portal itself) — this requires Stripe Dashboard config, not code. I'll note this as a follow-up the operator does in Stripe directly.
- Per-location pricing migration (deferred per memory entry above).
- E2E test of the actual `past_due` → email → banner → save-offer → portal flow — would require a real Stripe test subscription transition.

### Files touched
- `mem://features/reputation-subscription-gating` (rewrite)
- `mem://index.md` (one-line entry update + Deferral Register row)