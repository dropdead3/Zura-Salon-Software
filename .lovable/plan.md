

# Zura Pay Build Analysis: Gaps, Bugs, and Enhancements

## Bugs

### B1: Deleting a card from UI does not detach it from Stripe
**Severity: P0**

`useDeleteClientCard` (line 43-58 in `useDepositData.ts`) only deletes the row from `client_cards_on_file` in the database. It never calls Stripe to detach the payment method. The card remains active in Stripe and could still be charged. The webhook handler for `payment_method.detached` exists but is never triggered because no detach call is made.

**Fix:** Create a `detach-card-on-file` edge function that:
1. Looks up the card's `stripe_payment_method_id` and the org's connected account
2. Calls `stripe.paymentMethods.detach(pmId)` on the connected account
3. Deletes the row from `client_cards_on_file`
4. Update `useDeleteClientCard` to invoke this edge function instead of directly deleting the row

### B2: `BookingConfirmation` never receives deposit or card-on-file props
**Severity: P1**

In `HostedBookingPage.tsx` (line 218-231), the `BookingConfirmation` component is rendered without `depositAmount`, `depositPolicyText`, `cancellationPolicyText`, or `requiresCardOnFile` props. The component supports these props but they're never passed. Clients booking services that require deposits or card-on-file see no indication of those requirements, and no payment collection occurs.

**Fix:** Look up the selected service's deposit/card-on-file settings and booking policies, then pass them to `BookingConfirmation`. This is a data-wiring fix only.

### B3: `handleConfirm` in HostedBookingPage does not create an appointment
**Severity: P1**

The confirm handler (line 128-138) only sets `isConfirmed: true` and sends an embed message. No appointment is actually created in the database, no deposit is collected, and no card-on-file is captured. The entire booking surface is effectively a UI shell with no backend persistence.

**Fix:** This is a larger feature gap (see G1 below). The confirm handler needs to insert an appointment and, when required, collect a deposit or card via `collect-booking-deposit`.

### B4: `setDefault` non-atomic — no org_id filter on the set step
**Severity: P2**

In `useSetDefaultCard` (line 188-213), the "set as default" step (line 201-204) only filters by `card.id` without also filtering by `organization_id`. While the clear step correctly filters by org + client, the set step relies solely on the card UUID. Low risk due to UUID uniqueness, but violates multi-tenant isolation doctrine.

**Fix:** Add `.eq('organization_id', orgId)` to the set-default update query.

## Gaps

### G1: Public booking surface has no payment capture
The booking surface shows deposit info and card-on-file badges in `BookingConfirmation` (when props are passed) but has no Stripe Elements integration to actually collect payment. There is no `@stripe/stripe-js` or `@stripe/react-stripe-js` dependency. The `collect-booking-deposit` edge function exists but is never called from the booking flow.

This is the largest gap in the Zura Pay build. Without it, services marked `require_card_on_file: true` or `requires_deposit: true` can be booked without any payment capture.

### G2: No client-facing card management
There is no public-facing UI for clients to view or remove their saved cards. The `PaymentMethodsCard` component exists only in the dashboard (admin-side). Clients have no self-service way to manage their payment methods, which may create compliance concerns (data subject rights).

### G3: Service editor card-on-file toggle exists but has no downstream enforcement
The `ServiceEditorDialog` correctly saves `require_card_on_file` to the services table, and `ConfirmStep` (dashboard booking) shows a badge. But neither the public booking surface nor the kiosk booking wizard checks this flag to gate booking completion.

## Enhancements

### E1: Add "Add Card" button to PaymentMethodsCard
Currently, the `PaymentMethodsCard` only shows existing cards. Staff cannot add a new card for a client from the client profile. Adding a "Save Card" action that creates a Stripe SetupIntent on the connected account and uses Stripe Elements to collect card details would close this gap.

### E2: Expired card indicator
Cards with `card_exp_month`/`card_exp_year` in the past should show an "Expired" badge. Currently expired cards look identical to active ones and will fail silently when charged.

## Recommended Priority

| # | Type | Severity | Description |
|---|------|----------|-------------|
| B1 | Bug | P0 | Card delete doesn't detach from Stripe |
| B2 | Bug | P1 | Booking surface missing deposit/card props |
| B3 | Bug | P1 | Booking surface doesn't create appointments |
| B4 | Bug | P2 | setDefault missing org_id filter |
| G1 | Gap | P0 | No payment capture in public booking |
| G2 | Gap | P3 | No client-facing card management |
| G3 | Gap | P1 | Card-on-file flag not enforced at booking time |
| E1 | Enhancement | P2 | Add card from client profile |
| E2 | Enhancement | P3 | Expired card badge |

## Recommended Immediate Fixes (B1 + B4 + E2)

These are surgical, low-risk fixes that can ship now without the larger booking-surface payment integration (G1/B3).

### Changes

**New edge function:** `supabase/functions/detach-card-on-file/index.ts`
- Accepts `organization_id` and `card_id`
- Looks up the card, gets the connected account, calls `stripe.paymentMethods.detach()`
- Deletes the row from `client_cards_on_file`
- Returns success/error

**Modified:** `src/hooks/useDepositData.ts`
- `useDeleteClientCard`: invoke `detach-card-on-file` edge function instead of direct DB delete
- `useSetDefaultCard`: add `.eq('organization_id', orgId)` to the set step

**Modified:** `src/components/dashboard/clients/PaymentMethodsCard.tsx`
- Add expired card detection: compare `card_exp_month`/`card_exp_year` against current date
- Show red "Expired" badge for expired cards
- Disable "Set Default" for expired cards

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/detach-card-on-file/index.ts` | New edge function for Stripe detach + DB delete |
| `src/hooks/useDepositData.ts` | Update delete to use edge function; fix setDefault org filter |
| `src/components/dashboard/clients/PaymentMethodsCard.tsx` | Add expired card badge + disable default for expired |

1 new edge function, 0 migrations, 0 new dependencies.

