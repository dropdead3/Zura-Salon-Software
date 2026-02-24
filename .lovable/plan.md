

## Service Deposit and Prepayment System

### Current State Assessment

The codebase has several related pieces but **no functional deposit/prepay system**:

- **`require_deposit` toggle** exists in Website Booking Settings but is cosmetic -- it saves to `site_settings` JSON but nothing reads it or enforces it
- **`cancellation_fee_policies` table** exists (with `policy_type`, `fee_type`, `fee_amount`, `min_notice_hours`) but has zero rows and no UI to manage it
- **No client payment method storage** -- there is no `client_cards_on_file` or equivalent table. Stripe integration exists only for platform billing (org subscriptions) and booth renter autopay
- **No deposit tracking on appointments** -- neither `appointments` nor `phorest_appointments` has deposit-related columns
- **Policies page** references deposits and cancellation fees in hardcoded FAQ copy, but these are not driven by configurable data

### What Needs to Be Built

This is a multi-layer feature spanning data, settings, booking flow, appointment lifecycle, and payment infrastructure.

---

### Layer 1: Service-Level Deposit Configuration

Add deposit fields to the `services` table so operators can mark specific services as requiring a deposit.

**New columns on `services`:**

| Column | Type | Default | Purpose |
|---|---|---|---|
| `requires_deposit` | boolean | false | Whether this service requires a deposit to book |
| `deposit_type` | text | 'percentage' | 'percentage' or 'flat' |
| `deposit_amount` | numeric | null | Dollar amount (flat) or percentage value |
| `deposit_amount_flat` | numeric | null | If type is percentage, optional min flat amount |

**Settings UI update:** Add a "Deposit" section to the service edit form in Services Settings (`ServicesSettingsContent.tsx`), showing the toggle and amount fields when enabled.

### Layer 2: Client Card-on-File Storage

Create a `client_cards_on_file` table to store Stripe payment method references for salon clients.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | Row identity |
| `organization_id` | uuid | Tenant scope |
| `client_id` | uuid | FK to `phorest_clients.id` |
| `stripe_customer_id` | text | Stripe customer ID |
| `stripe_payment_method_id` | text | Stripe payment method ID |
| `card_brand` | text | Visa, Mastercard, etc. |
| `card_last4` | text | Last 4 digits |
| `card_exp_month` | integer | Expiration month |
| `card_exp_year` | integer | Expiration year |
| `is_default` | boolean | Default card flag |
| `created_at` | timestamptz | Auto |

RLS: org-member read, org-admin write.

### Layer 3: Deposit Tracking on Appointments

Add deposit tracking columns to both appointment tables.

**New columns on `appointments` and `phorest_appointments`:**

| Column | Type | Purpose |
|---|---|---|
| `deposit_required` | boolean (default false) | Whether a deposit was required |
| `deposit_amount` | numeric | The deposit amount charged |
| `deposit_status` | text | 'pending', 'collected', 'refunded', 'applied', 'forfeited' |
| `deposit_collected_at` | timestamptz | When deposit was collected |
| `deposit_stripe_payment_id` | text | Stripe payment intent ID |
| `deposit_applied_to_total` | boolean (default false) | Whether deposit was credited toward final payment |

### Layer 4: Booking Flow Integration

**Internal booking (BookingWizard / QuickBookingPopover):**
- On the **ConfirmStep**, if any selected service has `requires_deposit = true`, display a deposit summary section showing the deposit amount and a note that it will be collected
- For internal bookings, the operator can choose: "Collect now" (charge card on file) or "Mark as pending" (deposit required but not yet collected)
- Add a `deposit_status` field to the booking creation payload

**Online booking (KioskBookingWizard / Website booking):**
- If `require_deposit` is enabled in Website Settings AND the service requires a deposit, add a payment step before confirmation
- This step collects card details via Stripe Elements, creates a PaymentIntent for the deposit amount, and stores the card on file
- Booking is only confirmed after successful deposit charge

### Layer 5: Deposit Lifecycle in Appointment Detail Panel

In `AppointmentDetailSheet.tsx`, add deposit visibility:

- **Details tab:** Show deposit status badge (Pending / Collected / Applied / Refunded) near the pricing section
- **Ellipsis menu:** Add "Collect Deposit" action (if status is pending) and "Refund Deposit" action (if collected, manager-only)
- **On completion:** When appointment status changes to `completed`, prompt operator to apply deposit toward total or leave as separate

### Layer 6: Cancellation Fee Policy Activation

The `cancellation_fee_policies` table already exists but is unused. Wire it up:

- **Settings UI:** Add a "Cancellation & No-Show Fees" section in Website Settings or a dedicated Settings tab, allowing operators to configure tiered fee policies (72h+, 24-72h, under 24h)
- **Cancellation flow:** When an appointment is cancelled via the ellipsis menu, check the cancellation policy. If a fee applies, show a confirmation dialog with the fee amount and option to charge the card on file or waive
- **No-show flow:** Same logic when marking as no-show

### Layer 7: Edge Function for Deposit Collection

Create `supabase/functions/collect-deposit/index.ts`:
- Accepts `appointment_id`, `payment_method_id` (or card-on-file ID)
- Creates a Stripe PaymentIntent for the deposit amount
- Updates the appointment's deposit columns on success
- Logs an audit event

Create `supabase/functions/refund-deposit/index.ts`:
- Accepts `appointment_id`
- Issues a Stripe refund against the original PaymentIntent
- Updates deposit status to 'refunded'
- Manager-only authorization check

---

### Gaps and Complications Identified

1. **Stripe Connect vs Direct:** The platform uses Stripe for org billing. Client deposits need to flow to the salon's own Stripe account. This requires either Stripe Connect (where the platform acts as intermediary) or the org providing their own Stripe keys. The `organizations` table has `stripe_payments_enabled` and `stripe_payment_intent_id` columns, suggesting some groundwork exists, but the full Connect flow for client-facing payments needs validation.

2. **Phorest appointments vs native appointments:** Deposit tracking must work on both `phorest_appointments` and `appointments`. The booking flow currently writes to different tables based on source. The deposit columns and lifecycle logic must be consistent across both.

3. **Multi-service deposit calculation:** When an appointment has multiple services and only some require deposits, the system needs to calculate the aggregate deposit (sum of individual service deposits). The ConfirmStep must break this down clearly.

4. **Card-on-file consent and PCI compliance:** Storing card references requires explicit client consent. The online booking flow needs a consent checkbox. The system only stores Stripe tokens (not raw card numbers), which is PCI-compliant, but the consent UX must be designed.

5. **Deposit vs. prepayment distinction:** Some services (like extensions) require full prepayment, not just a deposit. The `deposit_type` should support a 'full_prepay' option where the entire service price is collected upfront.

6. **Cancellation fee enforcement without card on file:** If a client does not have a card on file and cancels late, the fee becomes an outstanding balance. This needs integration with the `client_balances` system (existing) to record a negative credit/debit.

7. **Website booking settings gap:** The `require_deposit` toggle is global but deposit requirements are per-service. The global toggle should act as the master switch, with per-service configuration controlling which services actually require it. Both must agree for a deposit to be enforced.

8. **Kiosk booking flow:** The `KioskBookingWizard` also needs deposit awareness -- if a walk-in selects a deposit-required service, the kiosk should either collect payment or flag the booking for front-desk deposit collection.

---

### Technical Summary

| Layer | Artifacts |
|---|---|
| Database | Migration: add deposit columns to `services`, `appointments`, `phorest_appointments`; create `client_cards_on_file` table with RLS |
| Edge Functions | `collect-deposit/index.ts`, `refund-deposit/index.ts` |
| Hooks | `useServiceDeposits.ts` (deposit config per service), `useClientCardsOnFile.ts` (card management), `useDepositLifecycle.ts` (collect/refund/apply mutations) |
| Settings UI | Service edit form deposit fields, Cancellation fee policy manager, Website booking deposit toggle enhancement |
| Booking Flow | ConfirmStep deposit summary, online booking payment step, kiosk deposit awareness |
| Appointment Panel | Deposit status badge, Collect/Refund actions in ellipsis menu, apply-to-total on completion |
| Cancellation Flow | Fee calculation on cancel/no-show, charge or waive dialog |

### Recommended Build Order

1. Database migration (service deposit columns + client cards table + appointment deposit columns)
2. Service settings UI (deposit configuration per service)
3. Hooks for deposit data and card-on-file management
4. Internal booking flow updates (ConfirmStep deposit display)
5. Edge functions for deposit collection/refund
6. Appointment detail panel deposit status and actions
7. Cancellation fee policy UI and enforcement
8. Online/kiosk booking payment step (requires Stripe Elements integration)

