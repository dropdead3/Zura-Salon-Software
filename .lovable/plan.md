

# Add "Collect" Action to Pending Fee Rows

## Problem

The Fee Ledger card now supports waiving pending fees, but there's no way to **collect** them. Operators must navigate to the Appointment Detail Sheet to trigger a card-on-file charge. The `charge-card-on-file` edge function already handles the full Stripe charge flow and writes the fee ledger record — it just needs to be invoked from this surface.

## Changes

### `src/pages/dashboard/admin/PaymentOps.tsx` — FeeLedgerCard

**1. Expand the appointment join** to include `client_id` and `phorest_client_id` so we can pass the client identifier to the charge function:

```
appointment:appointment_id (client_name, client_id, phorest_client_id, appointment_date, status)
```

**2. Add a "Collect" button** next to the existing "Waive" button in the Actions column for pending rows. Use `tokens.button.inline` with default variant (not destructive).

**3. Add a collect confirmation AlertDialog** with:
- Title: "Collect Fee Charge"
- Description showing client name, fee type, and amount
- Card on file pre-flight: before showing the dialog, query `client_cards_on_file` for the client's default card to display card details (brand + last4) in the confirmation — or show a warning if no card is on file
- Expired card check using existing `isCardExpired` utility
- Confirm + Cancel buttons

**4. Add a collect mutation** that:
- Invokes `charge-card-on-file` edge function with `organization_id`, `appointment_id`, `client_id`, `amount` (fee_amount), `fee_type`, and `description`
- The edge function already inserts the fee ledger record and handles Stripe — but it creates a **new** record rather than updating the existing pending one
- After successful charge, update the existing pending fee charge record: `status = 'collected'`, `collected_via = 'card_on_file'`, `charged_at = now()`
- This prevents duplicate ledger entries (edge function insert + existing pending row) — we need to **skip** the edge function's own insert or update the existing row. Simplest approach: update the existing pending record to `collected` after the charge succeeds, and accept the edge function may also insert one (then deduplicate), OR better: pass the `fee_charge_id` in the edge function body and have it update instead of insert when provided

**Revised approach (cleaner)**: Don't use the edge function's ledger insert. Instead:
- Invoke `charge-card-on-file` (it will try to insert a new fee charge record)
- After success, update the **existing** pending record to `status = 'collected'`, `collected_via = 'card_on_file'`, `charged_at = now()`
- Delete the duplicate record the edge function created (by matching `appointment_id` + `fee_type` + `status = 'collected'` + `id != originalId`)

**Simplest approach**: Update `charge-card-on-file` to accept an optional `fee_charge_id`. When provided, it updates that record instead of inserting a new one.

**5. State additions**: `collectDialogOpen`, `collectingChargeId`, `clientCard` (fetched on click)

**6. Query invalidation on success**: `['fee-ledger']`, `['fee-ledger-pending-count']`

### `supabase/functions/charge-card-on-file/index.ts`

**Accept optional `fee_charge_id`** in the request body. In the fee ledger insert block (near the end), if `fee_charge_id` is provided, update that record to `status = 'collected'` instead of inserting a new one:

```typescript
if (fee_charge_id) {
  await supabase.from('appointment_fee_charges').update({
    status: 'collected',
    collected_via: 'card_on_file',
    charged_at: new Date().toISOString(),
  }).eq('id', fee_charge_id);
} else {
  // existing insert logic
  await supabase.from('appointment_fee_charges').insert({ ... });
}
```

## Technical Notes

- Card lookup query runs on-click before showing dialog — prevents attempting charges with no card
- `isCardExpired` from `@/lib/card-utils.ts` blocks expired cards with a toast
- The edge function already handles idempotency keys, Stripe connected account lookup, and org membership checks
- No migration needed — all columns exist

## Files Summary

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/PaymentOps.tsx` | Add Collect button, dialog, card lookup, and mutation |
| `supabase/functions/charge-card-on-file/index.ts` | Accept optional `fee_charge_id` to update existing record instead of inserting |

0 migrations, 0 new edge functions, 0 new dependencies.

