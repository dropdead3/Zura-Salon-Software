

## Pass Afterpay Surcharge Amount to Receipt Generators

The `groupedTransactionToReceiptData` function now accepts an optional `afterpaySurchargeAmount` parameter, but neither `TransactionDetailSheet.tsx` nor `ReceiptPrintView.tsx` pass this value. The surcharge data lives on the `appointments` table and is not currently fetched during transaction grouping.

### Changes Required

| Action | File | Change |
|--------|------|--------|
| **Modify** | `src/hooks/useGroupedTransactions.ts` | Add `afterpaySurchargeAmount` to `GroupedTransaction` interface; fetch from `appointments` table when building transactions |
| **Modify** | `src/components/dashboard/transactions/TransactionDetailSheet.tsx` | Pass `transaction.afterpaySurchargeAmount` to `groupedTransactionToReceiptData()` |
| **Modify** | `src/components/dashboard/transactions/ReceiptPrintView.tsx` | Update `printReceipt()` to accept and forward `afterpaySurchargeAmount` |

### Technical Details

1. **Hook Enhancement**: When `appointmentIds` are collected (line 191), add a parallel query to fetch `id, afterpay_surcharge_amount` from the `appointments` table. Build a map and join it during transaction assembly.

2. **Interface Update**: Add `afterpaySurchargeAmount?: number \| null` to `GroupedTransaction` interface.

3. **Caller Updates**: Both `TransactionDetailSheet.tsx` (line 424) and `ReceiptPrintView.tsx` (line 232) need to forward the surcharge amount to the receipt data generator so the "Afterpay Processing Fee" line item appears on printed/emailed receipts.

No database migrations required. All changes are TypeScript interface and query logic updates.

