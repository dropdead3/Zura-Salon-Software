

# Wire Color Room Charges into Transaction-Page Receipts

## Problem
The Transactions page receipt (`ReceiptPrintView`) only renders POS line items from `phorest_transaction_items`. It does not query or display `checkout_usage_charges` (Color Room overage and product cost charges). The checkout flow on the Schedule page already includes these — this creates an inconsistency.

## Challenge: Linking Transactions to Usage Charges
`checkout_usage_charges` links via `appointment_id`, and `phorest_transaction_items` has an `appointment_id` column — but it's currently unpopulated (all NULL). The join path is:

```text
phorest_transaction_items.appointment_id → checkout_usage_charges.appointment_id
```

Since this column is empty today, the immediate approach is to query usage charges by **date + organization** and match by `appointment_id` where available, but also surface them as a separate "Color Room" section on the receipt even without a perfect join (since all charges for that date belong to the salon).

## Plan

### 1. Extend `GroupedTransaction` type (`useGroupedTransactions.ts`)
- Add `appointmentId: string | null` field, mapped from `first.appointment_id`
- Add `usageCharges: UsageChargeLineItem[]` array to the interface
- After grouping transactions, collect all non-null `appointment_id` values
- Query `checkout_usage_charges` for those appointment IDs (status = 'approved' or 'pending')
- Attach matching charges to each `GroupedTransaction` by appointment_id

### 2. Define `UsageChargeLineItem` type
```ts
interface UsageChargeLineItem {
  id: string;
  serviceName: string | null;
  chargeType: string; // 'overage' | 'product_cost'
  overageQty: number;
  chargeAmount: number;
  status: string;
}
```

### 3. Update `ReceiptPrintView.tsx`
- Accept `usageCharges` from the `GroupedTransaction` (already part of the type after step 1)
- After the existing items table, render a "Color Room Charges" section if `transaction.usageCharges.length > 0`
- Each charge renders as a row: service name (or "Product Cost"), overage qty, charge amount
- Add the total of usage charges to the grand total calculation
- Keep all styling black/white consistent with existing receipt

### 4. Update `TransactionDetailSheet.tsx`
- Show usage charges in the detail view below the line items table
- Label section "Color Room Charges" with a small header
- Each row shows charge type badge, service name, overage qty, and amount

### 5. No DB migration needed
All data already exists in `checkout_usage_charges`. This is a read-only integration.

## Scope
- 4 files modified: `useGroupedTransactions.ts`, `ReceiptPrintView.tsx`, `TransactionDetailSheet.tsx`, and the `GroupedTransaction` type
- No new tables or migrations
- Graceful fallback: if no appointment_id link exists or no charges found, receipt renders exactly as before

