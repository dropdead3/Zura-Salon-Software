

# Surface `payment_failure_reason` in Dock Card and Schedule UI

## Problem

The `payment_failure_reason` is stored on the `appointments` table by the webhook but never surfaced in the UI. Staff have no way to see *why* a charge failed without checking externally. Additionally, the `phorest_appointments` table lacks this column entirely, so failures on phorest-sourced appointments can't be tracked.

## Changes

### 1. Migration: Add `payment_failure_reason` to `phorest_appointments`
Ensures parity with the `appointments` table so both appointment sources can store decline reasons.

```sql
ALTER TABLE public.phorest_appointments
ADD COLUMN IF NOT EXISTS payment_failure_reason text;
```

### 2. Update webhook to write failure reason to both tables
**File:** `supabase/functions/stripe-webhook/index.ts`

In `handlePaymentIntentFailed`, after updating `appointments`, add a fallback update to `phorest_appointments` using the same `appointmentId`. This is safe — one will match, the other won't (no-op). Same pattern for the `handlePaymentIntentSucceeded` handler to clear the failure reason when a retry succeeds.

### 3. Add `payment_failure_reason` to `DockAppointment` interface
**File:** `src/hooks/dock/useDockAppointments.ts`

- Add `payment_failure_reason?: string | null` to the interface
- Include `payment_failure_reason` in both the `phorest_appointments` and `appointments` select queries
- Map the field through in all data transforms

### 4. Add `failed` badge with tooltip to `DockAppointmentCard`
**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`
**File:** `src/components/dock/dock-ui-tokens.ts`

- Add `failed` variant to `DOCK_BADGE` (red-themed, matching existing `unpaid` styling)
- Add `failed` entry to `PAYMENT_BADGE` map with label "Failed"
- Show the failed badge for any appointment (not just `completed`) when `payment_status === 'failed'`
- When `payment_failure_reason` exists, wrap the badge in a Tooltip showing the decline reason (e.g., "Insufficient funds", "Incorrect billing address")
- Show badge for non-terminal appointments too (so staff see it before/during the visit)

### 5. Handle AVS-related failure reasons
The user specifically asked about billing address and zip code errors. Stripe's `last_payment_error.message` already includes these natively (e.g., "Your card's zip code is incorrect", "Your card was declined due to billing address mismatch"). No special handling needed — the stored message will surface as-is in the tooltip.

The `decline_code` field from Stripe's error object provides more granular codes like `incorrect_zip`, `incorrect_address`. We'll store the human-readable `message` (already implemented) which covers these cases.

## UI Behavior

```text
┌─────────────────────────────────────────────┐
│  Jane D. · Balayage + Toner       Failed ⓘ  │
│  10:30 AM – 12:30 PM · 2h                   │
└─────────────────────────────────────────────┘
                                    ↑ tooltip:
                          "Your card's zip code
                           is incorrect"
```

- Badge appears in the top-right corner alongside existing status/payment badges
- Tooltip on hover/tap shows the specific Stripe decline reason
- Badge shown regardless of appointment status (scheduled, in_progress, completed)

## Files Summary

| File | Action |
|------|--------|
| **Migration** | Add `payment_failure_reason` to `phorest_appointments` |
| `supabase/functions/stripe-webhook/index.ts` | Write failure reason to both tables; clear on success |
| `src/hooks/dock/useDockAppointments.ts` | Add field to interface + queries |
| `src/components/dock/dock-ui-tokens.ts` | Add `failed` badge variant |
| `src/components/dock/schedule/DockAppointmentCard.tsx` | Add failed badge with tooltip |

1 migration, 0 new edge functions, 0 new dependencies.

