

# Update `charge.refunded` Handler to Support Partial Refund Status

## Problem

The existing `handleChargeRefunded` handler already detects partial refunds (comparing `amount_refunded` vs `amount`) but only logs the result — it does not update the appointment's `payment_status`. Staff have no visibility into partially refunded appointments without checking the Stripe Dashboard.

## Changes

### 1. Update partial refund branch in `handleChargeRefunded`
**File:** `supabase/functions/stripe-webhook/index.ts`

In the existing handler (around line 984), the `else` branch currently just logs. Update it to set `payment_status: 'partially_refunded'`:

```text
Before (line 984-986):
  } else {
    console.log(`Partial refund on appointment ${appointment.id}: ...`);
  }

After:
  } else {
    await supabase
      .from("appointments")
      .update({ payment_status: "partially_refunded" })
      .eq("id", appointment.id);
    console.log(`Appointment ${appointment.id} marked as partially refunded: ${refundAmount}/${chargeAmount} cents`);
  }
```

### 2. Surface `partially_refunded` status in UI

Since no frontend code currently references this status, the relevant appointment status displays (dock, calendar, payment ops) should handle the new value gracefully. The status badge/color system in `design-tokens.ts` may need a new entry for `partially_refunded` if it renders appointment payment statuses visually.

- Add a `partially_refunded` entry to any payment status color/config maps
- Ensure dock and calendar components render the badge correctly (they already fall through to default styling for unknown statuses, so this is cosmetic polish)

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Update partial refund branch to write `partially_refunded` status |
| UI status maps (if applicable) | Add `partially_refunded` badge styling |

0 migrations, 0 new edge functions, 0 new dependencies.

