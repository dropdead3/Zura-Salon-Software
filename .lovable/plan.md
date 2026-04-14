

## Add Surcharge Preview Row to CheckoutSummarySheet

The `CheckoutSummarySheet` already queries `afterpay_enabled` from the org but doesn't fetch the surcharge columns. The `SendToPayButton` accepts `afterpaySurchargeEnabled` and `afterpaySurchargeRate` props but `CheckoutSummarySheet` never passes them. This is both a gap (missing props) and the right place to add the preview.

---

### Changes

**1. Expand org query to include surcharge fields**

In `CheckoutSummarySheet.tsx`, update the existing `org-afterpay-enabled` query to also select `afterpay_surcharge_enabled` and `afterpay_surcharge_rate`, returning all three values as an object instead of a bare boolean.

**2. Pass surcharge props to `SendToPayButton`**

Wire `afterpaySurchargeEnabled` and `afterpaySurchargeRate` from the query result into the `SendToPayButton` component — currently these are accepted but never provided.

**3. Add surcharge preview row**

Below the `SendToPayButton`, when `afterpay_surcharge_enabled` is true, render a compact info row showing:

```text
┌─────────────────────────────────────────────┐
│ ⓘ  Afterpay surcharge preview              │
│    Service amount:       $4,000.00          │
│    Processing fee (6%):  +  $240.00         │
│    Client pays:          $4,240.00          │
└─────────────────────────────────────────────┘
```

- Uses `text-xs text-muted-foreground` styling with an `Info` icon
- Amounts formatted via `useFormatCurrency`
- Only visible when both `afterpay_enabled` and `afterpay_surcharge_enabled` are true
- For split payments (over $4,000), the preview reflects only the Afterpay portion ($4,000 max) plus its fee, not the full amount

---

### Technical Details

| Action | File | Change |
|--------|------|--------|
| Modify | `CheckoutSummarySheet.tsx` | Expand org query to include surcharge columns; pass props to `SendToPayButton`; add surcharge preview row |

Single file change. No database or edge function modifications needed.

