

## Add Explicit `payment_link_expires_at` Column

### Problem
Payment link expiry is currently calculated client-side as `payment_link_sent_at + 24h` via a hardcoded `LINK_EXPIRY_HOURS` constant. This creates two risks:
1. If the Stripe Checkout session expiry is ever customized (Stripe supports 30min–24h), the frontend badge will show the wrong countdown
2. The expiry logic is duplicated — Stripe controls the real expiry, but the UI guesses it

### Solution
Store the actual expiry timestamp when the payment link is created, sourced directly from the Stripe session's `expires_at`.

### Database Migration
- Add `payment_link_expires_at TIMESTAMPTZ` column to `appointments` table (nullable, no default)

### Edge Function Change
**File: `supabase/functions/create-checkout-payment-link/index.ts`**
- After creating the Stripe Checkout session, read `session.expires_at` (Unix timestamp from Stripe)
- Include `payment_link_expires_at: new Date(session.expires_at * 1000).toISOString()` in the appointment update

### Frontend Changes
**File: `src/components/dashboard/appointments/PaymentLinkStatusBadge.tsx`**
- Add `paymentLinkExpiresAt?: string | null` prop
- When present, use it directly instead of computing `addHours(sentDate, 24)`
- Keep the computed fallback for backwards compatibility with existing appointments that don't have the column populated
- Remove the `LINK_EXPIRY_HOURS` constant (replaced by prop or fallback)

**File: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`**
- Pass `paymentLinkExpiresAt={appointment.payment_link_expires_at}` to `PaymentLinkStatusBadge`

**File: `src/hooks/usePhorestCalendar.ts`**
- Add `payment_link_expires_at` to the appointment type

### Technical Details
- `session.expires_at` is a Unix timestamp (seconds) returned by Stripe on every Checkout Session creation
- Backwards compatible: existing rows with `NULL` in `payment_link_expires_at` fall back to the `sent_at + 24h` calculation
- No RLS changes needed — column inherits existing appointment RLS policies

