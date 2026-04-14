

## Three Enhancements: Realtime Status, Expiry Timer, Official Afterpay Logo

These are excellent suggestions — each addresses a real gap. The realtime update eliminates manual refresh friction, the expiry timer prevents staff from waiting on dead links, and the official logo strengthens brand trust on the booking surface.

---

### 1. Realtime Subscription for Payment Link Status

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

Add a Supabase Realtime subscription on the `phorest_appointments` table (already realtime-enabled) filtered to the current appointment ID. When `payment_link_sent_at`, `split_payment_link_intent_id`, `paid_at`, or `payment_status` changes, invalidate the appointment query so the `PaymentLinkStatusBadge` auto-updates.

```text
useEffect:
  channel = supabase.channel(`appt-pay-${appointmentId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'phorest_appointments',
      filter: `id=eq.${appointmentId}`
    }, () => queryClient.invalidateQueries(['appointment', appointmentId]))
    .subscribe()
  return () => supabase.removeChannel(channel)
```

This is lightweight — one channel per open detail sheet, cleaned up on close.

---

### 2. Payment Link Expiry Timer

**File:** `src/components/dashboard/appointments/PaymentLinkStatusBadge.tsx`

Stripe Checkout Sessions expire after 24 hours by default. Using the existing `payment_link_sent_at` timestamp, calculate expiry (`sentAt + 24h`) and render a countdown or "Expired" state.

- Import the existing `LiveCountdown` component from `src/components/dashboard/LiveCountdown.tsx`
- When `sentAt + 24h > now`: show `LiveCountdown` with `displayMode="compact"` inline with the badge
- When expired: replace the amber badge with a destructive "Link Expired" badge + "Create New Link" button (reuses the existing `onResend` callback)
- The `LiveCountdown` component already handles the tick interval, urgent state, and expired callback

---

### 3. Official Afterpay SVG Logo

**File:** `src/components/booking-surface/AfterpayPromoBadge.tsx`

Replace the placeholder circle-with-"4" SVG with the official Afterpay brand mark. Afterpay's brand guidelines provide a simple triangular mint-colored logo.

- Create `src/components/icons/AfterpayLogo.tsx` — a small component rendering the official Afterpay SVG mark (the triangular "A" mark in Afterpay's brand mint `#B2FCE4` or themed to match the booking surface)
- Update `AfterpayPromoBadge` to import and render `AfterpayLogo` instead of the inline SVG
- The logo component accepts `className` for sizing and optional `color` prop to respect the booking surface theme

---

### Technical Details

| Action | File | Change |
|--------|------|--------|
| Modify | `AppointmentDetailSheet.tsx` | Add realtime subscription for payment field changes |
| Modify | `PaymentLinkStatusBadge.tsx` | Add 24h expiry logic using `LiveCountdown`, "Expired" state with "Create New Link" |
| Create | `src/components/icons/AfterpayLogo.tsx` | Official Afterpay SVG mark component |
| Modify | `AfterpayPromoBadge.tsx` | Swap placeholder SVG for `AfterpayLogo` |

No database changes required. All three are additive UI enhancements.

