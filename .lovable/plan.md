

# G1: Wire Public Booking Surface to Create Appointments + Enforce Payment Policies

## E1 Status: Already Handled
`payment_intent.payment_failed` on line 1079 runs for **all events** (no `isConnectEvent` guard). Connect-scoped card-on-file charge failures already update `appointments.payment_status = 'failed'`. No changes needed.

## Problem (G1)
The public booking surface (`HostedBookingPage`) is a UI shell. When a client clicks "Confirm Booking":
- No appointment is created in the database
- No deposit is collected even when the service requires one
- No card-on-file is captured even when required
- `BookingConfirmation` never receives `depositAmount`, `requiresCardOnFile`, or policy text props

## Approach

Break G1 into two deliverables:

**Deliverable A (this plan):** Wire the confirm handler to create an appointment and pass deposit/card-on-file info to the confirmation screen. This makes the booking surface functional for services that don't require payment capture.

**Deliverable B (future):** Add Stripe Elements to the booking surface to collect card details for services that require deposits or card-on-file. This requires `@stripe/react-stripe-js` and a new `create-booking-setup-intent` edge function — a larger effort best planned separately.

For Deliverable A, services requiring payment capture will show policy text and a clear message that payment will be collected, but booking will still proceed (the salon can follow up). This matches common salon booking flows where the deposit is collected post-confirmation.

## Changes

### 1. Add deposit/card-on-file fields to `EligibleService`
**File:** `src/hooks/useBookingEligibleServices.ts`
- Add `requires_deposit`, `deposit_type`, `deposit_amount`, `require_card_on_file` to the `EligibleService` interface
- Add these columns to the `.select()` query (line 28)
- Map them in the return (line 118-128)

### 2. Create `create-public-booking` edge function
**File:** `supabase/functions/create-public-booking/index.ts`
- **No auth required** — this is a public endpoint for unauthenticated clients
- Accepts: `organization_id`, `service_name`, `stylist_id` (nullable), `location_id` (nullable), `date`, `time`, `client_info` (name, email, phone, notes)
- Input validation via Zod
- Rate limiting: check recent bookings by email (max 5 per hour per org) to prevent abuse
- Finds or creates a client record in `clients` table by email + org
- Inserts into `appointments` with status `pending`, source `online_booking`
- If service has `requires_deposit` or `require_card_on_file`, sets `deposit_required: true` or `card_on_file_required: true` on the appointment
- Returns the appointment ID and payment requirements

### 3. Wire `HostedBookingPage` confirm handler
**File:** `src/components/booking-surface/HostedBookingPage.tsx`
- Look up selected service's deposit/card-on-file settings from `eligibleServices`
- Pass `depositAmount`, `requiresCardOnFile`, `depositPolicyText`, `cancellationPolicyText` to `BookingConfirmation`
- Replace the shell `handleConfirm` with an async handler that:
  1. Sets `isSubmitting: true`
  2. Calls `create-public-booking` edge function
  3. On success, sets `isConfirmed: true` and sends embed message
  4. On error, shows toast and re-enables the button
- Pass `isSubmitting` to `BookingConfirmation`

### 4. Fetch booking policies from org config
**File:** `src/components/booking-surface/HostedBookingPage.tsx`
- Add a query for the org's `booking_surface_config` to extract `depositPolicyText` and `cancellationPolicyText` from the hosted config (these are already in the `BookingSurfaceConfig` type via `hosted.policyText` — we'll use that, plus add dedicated deposit/cancellation policy fields if they exist)

### 5. Update `BookingConfirmation` button text
**File:** `src/components/booking-surface/BookingConfirmation.tsx`
- When `depositAmount > 0`: button says "Confirm & Pay Deposit"
- When `requiresCardOnFile`: button says "Confirm & Save Card"
- Otherwise: "Confirm Booking"
- For Deliverable A (no Stripe Elements yet): if deposit/card is required, show an info message that the salon will contact them to collect payment. The button stays "Confirm Booking".

## Technical Details

**Edge function structure:**
```
POST /create-public-booking
Body: {
  organization_id, service_name, stylist_id?,
  location_id?, date, time, 
  client: { first_name, last_name, email, phone?, notes? }
}
Response: {
  success: true, appointment_id, 
  requires_deposit: bool, requires_card_on_file: bool
}
```

**Rate limiting:** Query `appointments` where `client_email = X` and `created_at > now() - 1h` and `organization_id = Y`. If count >= 5, return 429.

**Client upsert:** Match by `email + organization_id`. If exists, update name/phone. If not, insert new client row.

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useBookingEligibleServices.ts` | Add deposit/card fields to interface + query |
| `supabase/functions/create-public-booking/index.ts` | New edge function — appointment creation |
| `src/components/booking-surface/HostedBookingPage.tsx` | Wire confirm handler + pass payment props |
| `src/components/booking-surface/BookingConfirmation.tsx` | Dynamic button text + payment info messaging |

1 new edge function, 0 migrations, 0 new dependencies.

