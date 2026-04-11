

# Chemical Overage Fees Drilldown — Show Service Names & Remove Client Mix

## Problem
1. The "Chemical Overage Fees" category drilldown shows items as "Vish Product Charge" or "Vish" — it doesn't tell you **which service** triggered the overage fee.
2. The stylist sub-drilldown shows "New/Returning client" counts and a progress bar, which is meaningless for chemical overage fees.

## Approach

### 1. Resolve the associated service name per Vish charge

In `useRevenueByCategoryDrilldown.ts`, when building the category data for "Chemical Overage Fees":
- Collect the `transaction_id` for each Vish item
- After the main loop, batch-query `phorest_transaction_items` for those `transaction_id`s, filtering `item_type = 'service'`, to find the service name on the same ticket
- Build a map: `transaction_id → service_name`
- Store the associated service name on each Vish stylist entry (e.g. as a `serviceNames` field on the stylist data)

This requires adding `transaction_id` to the initial select query.

### 2. Add service context to the data model

Extend `CategoryStylistData` with an optional `serviceDetails?: { serviceName: string; amount: number }[]` array. For "Chemical Overage Fees", each stylist entry will carry the list of services that triggered the fees.

### 3. Conditionally hide client mix for Chemical Overage Fees

In `RevenueByCategoryPanel.tsx`:
- Pass `category.category` (the category name string) down to `StylistRow`
- When category is `"Chemical Overage Fees"`, skip rendering `ClientMixPanel` (no new/returning client breakdown)
- Instead, show the service names associated with each stylist's overage fees (e.g. "Color Touch · Balayage")

### 4. Update labels

For "Chemical Overage Fees", change the stylist subtitle from `"3 appointments"` to `"3 charges"` since these aren't appointments.

## Files Modified

| File | Change |
|---|---|
| `src/hooks/useRevenueByCategoryDrilldown.ts` | Add `transaction_id` to select; after main loop, batch-fetch service names for Vish transactions; populate `serviceDetails` on stylist data |
| `src/components/dashboard/sales/RevenueByCategoryPanel.tsx` | Pass category name to `StylistRow`; conditionally hide `ClientMixPanel` for Chemical Overage Fees; show associated service names instead; change "appointments" → "charges" label |

