

# Transactions Page Audit — Round 2

## Bugs Found

### 1. VoidConfirmDialog: AlertDialogAction closes dialog before async void completes (Critical)

`AlertDialogAction` from Radix automatically closes the dialog on click. The `handleVoid` is passed to `onClick` but the dialog closes immediately — before `mutateAsync` resolves. If the mutation fails, the dialog is already gone and the user sees only a toast error with no way to retry.

**Fix:** Replace `AlertDialogAction` with a regular `Button` and prevent dialog auto-close, or use `e.preventDefault()` on the `AlertDialogAction` to stop Radix from closing it.

### 2. VoidConfirmDialog: Reason state is never reset when reopened (Medium)

`reason` state persists across opens. If a user opens void, types a reason, cancels, then opens void on a different transaction, the old reason is still there.

**Fix:** Reset `reason` to `''` when `open` changes to `true` via `useEffect`.

### 3. Split payment classification wrong in TillBalanceSummary and PaymentMethodBadge (Medium)

Real data shows payment methods like `Credit;Credit`, `Credit;Cash`, `Credit;Appointment Deposit`. The `TillBalanceSummary` classifies anything with `;` as "split" and assigns the *full amount* to the split bucket. `Credit;Cash` should ideally split between card and cash, but at minimum `Credit;Credit` should be classified as card, not split.

**Fix:** Improve `resolvePaymentKey` — if all parts before/after `;` are the same type (e.g. `Credit;Credit`), classify as that type. Only classify as "split" when types differ.

### 4. KPI "Total Revenue" includes tip in totalAmount calculation (Medium)

`useGroupedTransactions` sets `totalAmount: subtotal + taxAmount`. But `subtotal` is the sum of `total_amount` column values. Looking at the data: a row has `total_amount: 213.00` and `tip_amount: 56.20`. The `total_amount` column likely already includes tip — meaning the KPI double-counts nothing, but the **detail sheet** shows `Total: totalAmount + tipAmount` (line 277), which would **double-count** tip if `total_amount` already includes it.

Need to verify: does `total_amount` include tip or not? If yes, the detail sheet's `formatCurrency(transaction.totalAmount + transaction.tipAmount)` is wrong.

**Fix:** Verify data semantics. If `total_amount` already includes tip, remove `+ transaction.tipAmount` from the detail sheet total line.

### 5. Detail sheet void callback doesn't refresh data (Medium)

`TransactionDetailSheet` renders its own `VoidConfirmDialog` (line 337-344). When void succeeds, `onOpenChange(false)` closes the sheet. But the parent page's `selectedTxn` state still holds stale data. If the user re-opens the same transaction before the query refetch completes, it shows as un-voided.

**Fix:** The `useVoidTransaction` hook already invalidates queries, so the stale state is transient. But clear `selectedTxn` when sheet closes.

### 6. Duplicate void/refund entry points cause confusion (Low)

Both the table kebab menu (in `GroupedTransactionTable`) and the detail sheet have Refund/Void actions. The table-level refund passes to the *page's* `RefundDialog`, while the sheet has its *own* `RefundDialog` instance. Two separate dialog instances can cause z-index conflicts and double-mutation if both are triggered.

**Fix:** Remove refund/void from the table kebab menu OR from the sheet — have one canonical path. Recommended: keep actions in the sheet only; kebab menu keeps "View Details" and "Print Receipt".

### 7. `useEffect` in TransactionDetailSheet is a no-op (Low)

Lines 74-76 have a `useEffect` that watches `voidOpen` and `refundOpen` but does nothing in the body. Dead code.

**Fix:** Remove the dead `useEffect`.

### 8. Receipt print popup may be blocked by browsers (Low)

`window.open('', '_blank')` is commonly blocked by popup blockers since it's not a direct user-click-to-open (it's called from a dropdown menu click handler, which some browsers don't trust).

**Fix:** Use the same window approach but consider fallback (e.g., render receipt inline in a new tab via data URI, or show a "popup blocked" toast).

### 9. Every transaction is 1:1 item — grouping adds overhead for no benefit (Observation)

All 2,022 transaction items have unique `transaction_id` values — there are zero multi-item transactions in the current dataset. The grouping logic works correctly but the items array is always length 1. This is fine architecturally but explains why the "items" badge always shows "1".

## Summary

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **Critical** | AlertDialogAction auto-closes before async void completes | Use `e.preventDefault()` or replace with Button |
| 2 | **Medium** | Void reason not reset on reopen | Add useEffect reset |
| 3 | **Medium** | `Credit;Credit` classified as "split" instead of "card" | Improve payment type resolution |
| 4 | **Medium** | Detail sheet total may double-count tip | Verify data semantics; fix total line |
| 5 | **Medium** | Stale selectedTxn after void/refund | Clear state on sheet close |
| 6 | **Low** | Duplicate refund/void entry points (table + sheet) | Consolidate to sheet only |
| 7 | **Low** | Dead useEffect in TransactionDetailSheet | Remove |
| 8 | **Low** | Print receipt popup may be blocked | Add fallback handling |

### Files to edit

| File | Changes |
|------|---------|
| `VoidConfirmDialog.tsx` | Fix AlertDialogAction auto-close; reset reason on reopen |
| `TransactionDetailSheet.tsx` | Remove dead useEffect; fix total line (tip double-count); remove duplicate RefundDialog |
| `GroupedTransactionTable.tsx` | Remove Refund/Void from kebab menu (keep View Details + Print) |
| `PaymentMethodBadge.tsx` | Improve `resolvePaymentKey` for same-type split (e.g. Credit;Credit → card) |
| `TillBalanceSummary.tsx` | Match improved payment classification logic |
| `Transactions.tsx` | Clear selectedTxn on sheet close |

