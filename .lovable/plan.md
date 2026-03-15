

# Backroom: Trial Period, ROI Dashboard, and Downgrade Confirmation

## 1. Trial Period (7/14 days)

**Approach:** Use Stripe's built-in `subscription_data.trial_period_days` on checkout — no separate trial tracking needed.

**UI (BackroomPaywall.tsx):**
- Add a trial duration selector (7 or 14 days) above the CTA
- CTA text changes to "Start 7-day free trial" / "Start 14-day free trial"
- Add reassurance copy: "No charge until trial ends. Cancel anytime."

**Edge function (create-backroom-checkout):**
- Accept `trial_days` parameter (7 or 14, default 0)
- Add `subscription_data.trial_period_days` to the Stripe checkout session
- Store `trial_days` in session metadata

**Webhook (stripe-webhook):**
- In `handleCheckoutCompleted`: store trial end date in `organization_feature_flags` override_reason metadata
- The existing flow already enables the backroom flag on checkout completion, so trial users get immediate access

**get-backroom-subscription:**
- Return `trial_end` from the Stripe subscription object when status is `trialing`
- BackroomSubscription page shows trial badge and countdown

## 2. ROI Dashboard

**New component: `BackroomROICard.tsx`** — added to the BackroomSubscription page as a new section.

**Data sources (all existing):**
- `backroom_analytics_snapshots` — waste cost, chemical cost per service
- `get-backroom-subscription` — subscription monthly cost
- Calculations: waste savings = baseline waste estimate minus current waste rate, net ROI = savings minus subscription cost

**UI sections:**
- "Your ROI" card with 3 KPIs: Monthly savings estimate, Subscription cost, Net benefit
- Simple bar or comparison visual (savings vs cost)
- Fallback: if no analytics snapshots exist yet, show placeholder with "We'll calculate your ROI once you have 30 days of usage data"

**New hook: `useBackroomROI.ts`** — queries analytics snapshots and subscription data, computes savings estimate.

## 3. Downgrade Confirmation Dialog

**New component: `DowngradeConfirmDialog.tsx`**

**Trigger:** When a user clicks a lower-tier plan on the Subscription page or hits "Change Plan" in the portal.

**Impact summary logic:** Map plan tiers to feature sets. Show what they lose:
- Professional → Starter: "You'll lose Supply AI insights, ghost loss detection, cost spike alerts, weekly intelligence digest"
- Unlimited → Professional: "You'll lose predictive demand forecasting, multi-location benchmarking, priority support"
- Unlimited → Starter: Combined list

**UI:**
- AlertDialog with warning icon
- Feature loss list with red X icons
- "Keep Current Plan" (primary) and "Proceed to Downgrade" (destructive) buttons
- "Proceed" opens the Stripe customer portal for the actual change

**Integration:** Replace the direct `openPortal` call on upgrade buttons in BackroomSubscription with a check — if the target plan index is lower, show the dialog first.

---

## Files to Create/Edit

| File | Action |
|------|--------|
| `BackroomPaywall.tsx` | Add trial selector + update CTA |
| `create-backroom-checkout/index.ts` | Add `trial_period_days` to Stripe session |
| `stripe-webhook/index.ts` | Store trial metadata |
| `get-backroom-subscription/index.ts` | Return `trial_end` and `status: trialing` |
| `src/hooks/backroom/useBackroomROI.ts` | New — compute ROI from snapshots + sub cost |
| `src/components/dashboard/backroom-settings/BackroomROICard.tsx` | New — ROI visualization |
| `src/components/dashboard/backroom-settings/DowngradeConfirmDialog.tsx` | New — impact summary dialog |
| `BackroomSubscription.tsx` | Add ROI card, trial badge, downgrade confirmation logic |

