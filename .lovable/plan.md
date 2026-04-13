

# Deposit Collection, Card-On-File & Policy Enforcement

## Current State

**Already built:**
- `services` table has `requires_deposit`, `deposit_type`, `deposit_amount`, `deposit_amount_flat`
- `ServiceEditorDialog` already has the full deposit toggle UI (percentage/flat/full prepay)
- `appointments` table has `deposit_required`, `deposit_amount`, `deposit_status`, `deposit_stripe_payment_id`, `deposit_collected_at`, `deposit_applied_to_total`
- `client_cards_on_file` table exists with Stripe customer/payment method references
- `cancellation_fee_policies` table exists with `policy_type` (cancellation/no_show), `fee_type`, `fee_amount`, `min_notice_hours`
- `CancellationFeePoliciesSettings` UI exists in Website Settings
- `useTerminalDeposit` hook exists (collect/capture/cancel)
- `useDepositData` hook has `useClientCardsOnFile`, `calculateDepositAmount`
- Booking surface (`HostedBookingPage`) and internal `BookingWizard` exist but don't collect deposits or cards

**Not built:**
- No deposit collection in booking flows (internal or public)
- No card-on-file collection during booking
- No "Require Card On File To Book" service setting
- No automatic charge on no-show/cancellation
- No manual "Charge Card On File" action in appointment detail
- No deposit policy text visible to customers
- No edge function to charge a card on file
- Cancellation policies not surfaced to customers in booking flow

## Schema Changes (1 migration)

### Add to `services` table:
- `require_card_on_file` BOOLEAN DEFAULT false — service-level toggle

### Add to `organizations` table (site_settings or new column):
- `deposit_policy_text` TEXT — customer-facing policy copy
- `cancellation_policy_text` TEXT — customer-facing cancellation/no-show policy copy

### Add to `appointments` table:
- `card_on_file_id` UUID REFERENCES `client_cards_on_file(id)` — which card was captured at booking
- `cancellation_fee_charged` NUMERIC — amount charged for no-show/cancellation
- `cancellation_fee_status` TEXT — 'pending' | 'charged' | 'waived' | 'failed'
- `cancellation_fee_stripe_payment_id` TEXT — PI for the fee charge

## New Edge Function: `charge-card-on-file`

Accepts: `organization_id`, `client_id`, `card_on_file_id` (or resolve from client), `amount`, `currency`, `description`, `appointment_id`

Logic:
1. Look up card → get `stripe_payment_method_id` and `stripe_customer_id`
2. Look up org's `stripe_account_id` from `organization_stripe_accounts`
3. Create a PaymentIntent with `off_session: true`, `confirm: true`, `payment_method`, `customer` on the Connected Account
4. Update appointment with `cancellation_fee_charged`, `cancellation_fee_status = 'charged'`, `cancellation_fee_stripe_payment_id`
5. Return result

## New Edge Function: `collect-booking-deposit`

Accepts: `organization_id`, `client_id`, `card_on_file_id`, `amount`, `currency`, `appointment_id`

Logic:
1. Look up card → `stripe_payment_method_id` + `stripe_customer_id`
2. Create PaymentIntent with `capture_method: 'manual'` (pre-auth hold) or `automatic` based on org preference
3. Update appointment `deposit_status = 'held'`, `deposit_stripe_payment_id`, `deposit_amount`, `deposit_collected_at`
4. Return PI ID + status

## UI Changes

### 1. Service Editor — Add "Require Card On File" toggle
**File:** `src/components/dashboard/settings/ServiceEditorDialog.tsx`

Add a new toggle below "Requires Deposit":
- "Require Card On File To Book" with tooltip: "Clients must save a payment method before this service can be booked. Enables automatic no-show and cancellation fee collection."
- When enabled alongside deposit, card on file is used for deposit collection too

### 2. Policies Configurator — Add policy text fields
**File:** `src/components/dashboard/settings/CancellationFeePoliciesSettings.tsx`

Add two text areas:
- "Deposit Policy" — displayed to customers during booking when a service requires a deposit
- "Cancellation & No-Show Policy" — displayed to customers during booking when card on file is required

These are saved to `site_settings` as a JSON value under a `booking_policies` key.

### 3. Booking Surface — Deposit & Card Collection
**File:** `src/components/booking-surface/BookingClientForm.tsx` (or new step)

When selected service has `requires_deposit` or `require_card_on_file`:
- Show policy text from `cancellation_fee_policies` + org policy text
- Show Stripe Elements card input (using org's Connected Account)
- On submit: save card via Stripe `SetupIntent` → insert into `client_cards_on_file`
- If deposit required: call `collect-booking-deposit` to pre-auth
- Display deposit amount in confirmation step

### 4. Internal Booking Wizard — Deposit awareness
**File:** `src/components/dashboard/schedule/booking/ConfirmStep.tsx`

- Show deposit requirement badge when service requires deposit
- Show "Card on file required" badge
- On confirm: if client has card on file → auto-collect deposit via edge function
- If no card on file → show warning that deposit collection is pending

### 5. Appointment Detail — Charge Card On File action
**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

When appointment is marked **no_show** or **cancelled**:
- Look up active `cancellation_fee_policies` matching the `policy_type`
- Calculate applicable fee
- If client has a card on file → show "Charge Cancellation Fee" button with amount + AlertDialog confirmation
- On confirm → call `charge-card-on-file` edge function
- Show fee status badge (Pending / Charged / Waived / Failed)
- Add "Waive Fee" option for managers

### 6. Appointment Detail — Manual "Charge Card On File"
Add a general-purpose "Charge Card" action in the payment section:
- Only visible when client has card on file
- Opens amount input dialog
- Calls `charge-card-on-file` with custom amount
- Records transaction in `phorest_sales_transactions`

### 7. Client Profile — Cards on File section
**File:** New section in client detail

- List saved cards (brand, last4, exp)
- Add card button (Stripe Elements SetupIntent)
- Remove card button
- Default card indicator

### 8. Booking Surface — Policy display
In the confirmation/review step of `HostedBookingPage`:
- If service has deposit → show deposit amount + deposit policy text
- If service has card on file requirement → show cancellation policy text
- Both displayed in a styled info box before final confirmation

## Reporting Integration

### Appointments Hub / Transactions
- Show deposit status column in appointment lists
- Show cancellation fee status where applicable
- Include deposit amounts in revenue summaries

### Client History
- Show deposit collection events
- Show cancellation fee charges
- Show card-on-file additions/removals

## Files Summary

| File | Action |
|------|--------|
| **Migration** | Add `require_card_on_file` to `services`; add `card_on_file_id`, `cancellation_fee_charged`, `cancellation_fee_status`, `cancellation_fee_stripe_payment_id` to `appointments` |
| `supabase/functions/charge-card-on-file/index.ts` | **New** — charge saved card via Connected Account |
| `supabase/functions/collect-booking-deposit/index.ts` | **New** — pre-auth deposit on saved card |
| `src/components/dashboard/settings/ServiceEditorDialog.tsx` | Add "Require Card On File" toggle |
| `src/hooks/useServicesData.ts` | Add `require_card_on_file` to Service interface |
| `src/components/dashboard/settings/CancellationFeePoliciesSettings.tsx` | Add deposit + cancellation policy text fields |
| `src/hooks/useDepositData.ts` | Add `useBookingPolicies` hook for policy text CRUD |
| `src/components/booking-surface/BookingClientForm.tsx` | Add card collection + deposit pre-auth for public booking |
| `src/components/booking-surface/BookingConfirmation.tsx` | Show deposit amount + policy text |
| `src/components/dashboard/schedule/booking/ConfirmStep.tsx` | Show deposit/card-on-file badges and warnings |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add "Charge Cancellation Fee" + "Charge Card" actions on no-show/cancel; fee status display |
| `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` | Apply deposit to final total at checkout |
| `src/pages/dashboard/admin/PaymentOps.tsx` | Add cancellation fee queue alongside existing refund/deposit sections |

1 migration, 2 new edge functions, 0 new dependencies.

