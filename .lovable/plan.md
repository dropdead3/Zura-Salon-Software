

# Backroom Platform Admin — Comprehensive Enhancements

## What's Missing Today

The current Backroom admin hub has price management, entitlements, supply library, and basic analytics. But it lacks the operational tools platform admins need to actually *run* the Backroom business: billing health visibility, coaching signals, trial lifecycle automation, and self-service diagnostics.

---

## 1. Billing & Payment Health Panel (New Tab: "Billing")

Add a 6th tab to `BackroomAdmin.tsx` showing Backroom-specific billing health:

**KPI cards**: Active subscriptions, past-due count, MRR at risk, avg days overdue.

**Per-org billing table** (queried from `organizations` + `backroom_location_entitlements`):
- Org name, subscription status badge (active/past_due/cancelled/trialing)
- Payment method status (valid/expiring/missing) — derived from Stripe via `stripe_customer_id`
- Last payment date + amount
- Next billing date
- Days overdue (if past_due)
- Plan end / trial end date
- Action buttons: "View in Accounts", "Send Payment Reminder"

**At-risk filter**: Quick toggle to show only past_due/cancelled/expiring orgs.

Data sources: `organizations` (subscription_status, stripe_customer_id, billing_email), `backroom_location_entitlements` (trial_end_date, stripe_subscription_id), existing `useStripePaymentsHealth` pattern.

---

## 2. Coaching & Adoption Signals (Enhance Analytics Tab)

Add a "Needs Coaching" section to the existing Analytics tab:

**Low reweigh compliance table**: Orgs where avg `reweigh_compliance_rate` < 50% from `staff_backroom_performance` — sorted worst-first. Columns: org name, avg reweigh %, avg waste %, session count, last active date.

**Inactive orgs**: Orgs with `backroom_enabled` but zero snapshots or no activity in 30+ days — "Setup incomplete" or "Gone dormant".

**Usage health score**: Simple red/amber/green dot per org based on: has snapshots (green), has snapshots but low reweigh (amber), no snapshots (red).

**Coaching action**: "Send Coaching Email" button per org that triggers a pre-built email template via the existing `sendEmail` pattern.

---

## 3. Backroom Trial Expiration Cron (New Edge Function)

The existing `trial-expiration` function only handles org-level trials. Create `backroom-trial-expiration` to handle per-location Backroom trials:

- Query `backroom_location_entitlements` where `status = 'trial'` and `trial_end_date` is past
- If org has a `stripe_subscription_id` on the entitlement → set status to `active` (converted)
- If no payment method → set status to `suspended`
- Send warning emails at 7/3/1 days before expiry
- Insert `platform_notifications` for each transition
- Log results to `edge_function_logs`

Register as a daily cron job.

---

## 4. Legacy Org Backfill Utility (Entitlements Tab)

Add a "Backfill" button in the Entitlements tab header for orgs that have `backroom_enabled = true` but zero rows in `backroom_location_entitlements`:

- Detect orphaned orgs (flag enabled, no location entitlements)
- Show count: "3 orgs have Backroom enabled without location entitlements"
- "Backfill All" button: for each orphaned org, create an entitlement row for every active location with `status: 'active'`, `plan_tier: 'starter'`
- Confirmation dialog before executing

---

## 5. Entitlements Tab — Trial & Billing Columns

Enhance the existing location entitlement panel to show:

- **Trial end date** column (already in DB, not shown in UI)
- **Stripe subscription ID** link (truncated, clickable)
- **Days remaining** for trials (calculated from `trial_end_date`)
- **Start trial** action: set status to `trial` with a date picker for `trial_end_date`

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/dashboard/platform/BackroomAdmin.tsx` | Add "Billing" tab |
| `src/components/platform/backroom/BackroomBillingTab.tsx` | **New** — billing health panel |
| `src/hooks/platform/useBackroomBillingHealth.ts` | **New** — query billing data |
| `src/components/platform/backroom/BackroomAnalyticsTab.tsx` | Add coaching/adoption signals section |
| `src/hooks/platform/useBackroomPlatformAnalytics.ts` | Add coaching metrics (low reweigh, inactive orgs) |
| `src/components/platform/backroom/BackroomEntitlementsTab.tsx` | Add trial columns, backfill utility, start-trial action |
| `supabase/functions/backroom-trial-expiration/index.ts` | **New** — per-location trial expiration cron |

No database migrations required — all columns already exist in `backroom_location_entitlements`.

