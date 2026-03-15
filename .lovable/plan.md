

# Strip Trial Logic, Add Money-Back Guarantee

## Overview

Remove all trial-related logic from the Backroom checkout flow and replace it with a 30-day money-back guarantee badge. The trial concept doesn't make sense for Backroom because it requires hardware (Acaia Pearl scale) and significant configuration before the software is useful.

## Changes

### 1. `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`
- Remove `TRIAL_OPTIONS` constant and `trialDays` state
- Remove the entire "Trial Duration Selector" card (lines 440-472)
- Remove `trial_days` from the checkout request body
- Remove `Clock` icon import (no longer needed for CTA)
- Update CTA button text: "Start {trialDays}-day free trial" → "Subscribe & Activate"
- Update subtitle under CTA: remove "No charge for X days" language, replace with "30-day money-back guarantee. ${monthlyTotal}/mo. Cancel anytime."
- Add a money-back guarantee badge/card above the CTA with a Shield icon: "30-Day Money-Back Guarantee — If Backroom doesn't work for your salon, get a full refund within 30 days. No questions asked."

### 2. `supabase/functions/create-backroom-checkout/index.ts`
- Remove `trial_days` from destructured request body (line 71)
- Remove `validTrialDays` calculation (line 72)
- Remove `trial_days` from `metadata` object (line 145)
- Remove the `trial_period_days` spread in `subscription_data` (line 149) — just pass metadata directly without trial

### 3. `supabase/functions/stripe-webhook/index.ts`
- Remove `trialDays` parsing (line 325)
- Remove `trialEndDate` calculation (lines 331-333)
- Remove trial references from `override_reason` strings
- Remove `trial_days` and `trial_end` from plan details flag
- Set entitlement `status` to `'active'` always instead of conditionally `'trial'`
- Set `trial_end_date` to `null` always in entitlement rows

### 4. `supabase/functions/backroom-trial-expiration/index.ts`
- This entire edge function exists solely to expire trials. It can be deleted or gutted. Recommend deleting it entirely since it serves no purpose without trials.

### Files Summary

| File | Action |
|------|--------|
| `BackroomPaywall.tsx` | Remove trial UI, add money-back guarantee |
| `create-backroom-checkout/index.ts` | Remove trial_days from checkout session |
| `stripe-webhook/index.ts` | Remove trial logic, always set status=active |
| `backroom-trial-expiration/index.ts` | Delete (no longer needed) |

