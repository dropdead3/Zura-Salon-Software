

# Backroom Refund Action Button with Anti-Abuse Protection

## Overview

Add a "Request Refund" button to the BackroomEntitlementsTab that appears only when `isRefundEligible` is true. Clicking it issues a Stripe refund, cancels the subscription, sets entitlement status to `refunded`, and marks the location so re-signup cannot claim another refund.

## Database Changes

**Migration — add anti-abuse columns to `backroom_location_entitlements`:**

| Column | Type | Purpose |
|--------|------|---------|
| `refunded_at` | `timestamptz` | When refund was processed (null = never refunded) |
| `refunded_by` | `uuid` | Who processed the refund |
| `prior_refund_count` | `integer default 0` | Incremented on each refund; checked on re-signup |

Add a trigger on INSERT: if a prior row exists for the same `(organization_id, location_id)` with `refunded_at IS NOT NULL`, copy `prior_refund_count + 1` into the new row and set `refund_eligible_until = NULL` (blocks future refund window).

## Edge Function: `process-backroom-refund`

1. Authenticate caller, verify platform admin or org admin role.
2. Look up the entitlement row — validate `refund_eligible_until > now()` and `refunded_at IS NULL`.
3. Retrieve `stripe_subscription_id` from the entitlement.
4. Call `stripe.subscriptions.cancel()` to cancel the subscription immediately.
5. Find the latest invoice for that subscription via `stripe.invoices.list({ subscription })` and issue `stripe.refunds.create({ payment_intent })` on it.
6. Update the entitlement row: `status = 'refunded'`, `refunded_at = now()`, `refunded_by = user_id`, increment `prior_refund_count`.
7. Log to `platform_audit_log`.
8. Return success with refund amount.

## Re-Signup Guard

When the stripe-webhook `handleCheckoutCompleted` creates new entitlement rows, check if `prior_refund_count > 0` for the same `(organization_id, location_id)`. If so, set `refund_eligible_until = NULL` — the location gets access but no refund window. This is handled by the DB trigger above, so no webhook code changes needed.

## UI Changes: `BackroomEntitlementsTab.tsx`

In the refund eligibility column (lines ~640-655), when `isRefundEligible` is true, add a "Refund" button next to the badge. Clicking it opens a confirmation dialog stating the refund amount (based on plan tier pricing), that access will be revoked immediately, and that re-subscribing will not be refund-eligible. On confirm, invoke the edge function.

After refund, the row shows status `refunded` with a `RefundBadge` and the date.

## Files

| File | Action |
|------|--------|
| Migration SQL | Add `refunded_at`, `refunded_by`, `prior_refund_count` columns + re-signup trigger |
| `supabase/functions/process-backroom-refund/index.ts` | New — Stripe refund + entitlement cancellation |
| `src/components/platform/backroom/BackroomEntitlementsTab.tsx` | Add Refund button + confirmation dialog |
| `src/hooks/backroom/useBackroomLocationEntitlements.ts` | Add `refunded_at`, `refunded_by`, `prior_refund_count` to interface |

## Anti-Abuse Summary

```text
First signup  → refund_eligible_until = activated_at + 30d, prior_refund_count = 0
Refund issued → status = 'refunded', refunded_at = now(), prior_refund_count = 1
Re-signup     → DB trigger sees prior_refund_count > 0, sets refund_eligible_until = NULL
Result        → "Request Refund" button never appears for repeat signups
```

