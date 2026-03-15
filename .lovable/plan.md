

# Backroom: Annual Toggle, Add Scales Flow, and Subscription Management

## Overview

Three additions to the Backroom billing system:

1. **Annual pricing toggle** on the paywall with 15% discount and free scale incentive
2. **Post-purchase "Add More Scales" flow** for existing subscribers
3. **Subscription management page** showing current plan, scale count, and upgrade path

---

## 1. Annual Pricing Toggle + Free Scale

**Stripe products needed:** 3 new annual prices for existing products (Starter, Professional, Unlimited).

| Plan | Monthly | Annual (15% off) | Annual $/mo |
|------|---------|-------------------|-------------|
| Starter | $39 | $397.80/yr | $33.15 |
| Professional | $79 | $805.80/yr | $67.15 |
| Unlimited | $129 | $1,315.80/yr | $109.65 |

**UI changes (BackroomPaywall.tsx):**
- Add a monthly/annual toggle switch above the plan cards
- When annual is selected: show crossed-out monthly price, annual per-month price, "Save 15%" badge, and "Includes 1 free Acaia Pearl scale" callout
- Update the price summary card to show annual billing breakdown
- CTA text changes to reflect annual billing

**Edge function changes (create-backroom-checkout):**
- Accept `billing_interval: 'monthly' | 'annual'` parameter
- Use annual price IDs when interval is annual
- When annual: subtract 1 from hardware quantity (free scale), ensure min 0 hardware charge
- Pass `billing_interval` in session/subscription metadata

**Webhook changes (stripe-webhook):**
- Store billing interval in `backroom_plan` flag metadata

---

## 2. Post-Purchase "Add More Scales" Flow

**New edge function: `add-backroom-scales`**
- Accepts `organization_id` and `additional_scales` count
- Looks up the org's existing Stripe subscription (via `stripe_customer_id`)
- Adds scale license line items to the existing subscription via `stripe.subscriptionItems.create`
- Creates a separate one-time invoice for hardware purchases
- Returns confirmation

**New UI component: `AddScalesDialog.tsx`**
- Triggered from the Stations & Hardware section of BackroomSettings
- Scale quantity stepper (1-10)
- Shows cost breakdown: $10/mo per license + $199 one-time per scale
- Calls the edge function, then redirects to Stripe checkout for the hardware payment

---

## 3. Subscription Management Page

**New page: `BackroomSubscription.tsx`** at `/dashboard/admin/backroom-subscription`

**Data source:** Query Stripe via a new edge function `get-backroom-subscription` that returns:
- Current plan tier (starter/professional/unlimited)
- Billing interval (monthly/annual)
- Scale count and license count
- Current period end date
- Subscription status
- Monthly/annual cost

**UI sections:**
1. **Current Plan card** — plan name, price, billing cycle, renewal date
2. **Scale Overview** — number of active scale licenses, hardware purchased
3. **Upgrade Path** — cards showing available upgrades with price difference
4. **Actions** — "Change Plan", "Add Scales", "Cancel Subscription" buttons
5. "Change Plan" and "Cancel" route to Stripe Customer Portal via a new `customer-portal` edge function

**Navigation:** Add a "Subscription" link in the BackroomSettings sidebar (new section entry) or as a banner at the top of the settings page when subscribed.

**Route:** Add to `App.tsx` as a protected route.

---

## Technical Summary

| Artifact | Type | Notes |
|----------|------|-------|
| 3 Stripe annual prices | Stripe products | Created via tool |
| `BackroomPaywall.tsx` | Component edit | Annual toggle, free scale logic |
| `create-backroom-checkout/index.ts` | Edge function edit | Annual price IDs, free scale deduction |
| `stripe-webhook/index.ts` | Edge function edit | Store billing interval |
| `add-backroom-scales/index.ts` | New edge function | Modify existing subscription |
| `get-backroom-subscription/index.ts` | New edge function | Read subscription details from Stripe |
| `customer-portal/index.ts` | New edge function | Stripe billing portal session |
| `AddScalesDialog.tsx` | New component | Post-purchase scale ordering |
| `BackroomSubscription.tsx` | New page | Subscription management |
| `App.tsx` | Route addition | New subscription page route |
| `BackroomSettings.tsx` | Nav link | Link to subscription management |

