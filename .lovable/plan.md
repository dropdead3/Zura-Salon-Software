

# Transactions Page Audit — Round 3

## Bugs Found

### 1. Refund/Void buttons hidden when `refundStatus === 'pending'` (Medium)

`TransactionDetailSheet.tsx` line 281: the condition `!transaction.isVoided && !transaction.refundStatus` hides **both** Refund and Void buttons when `refundStatus` is any truthy value — including `'pending'`. A pending refund should still allow voiding (leadership) and shouldn't block all actions. The condition should be `refundStatus !== 'completed'` instead of `!refundStatus`.

**Fix:** Change guard to `!transaction.isVoided && transaction.refundStatus !== 'completed'`.

### 2. `IssueCreditsDialog` missing `DRILLDOWN_DIALOG_CONTENT_CLASS` (Low)

Uses bare `<DialogContent className="sm:max-w-md">` while `RefundDialog` correctly uses `DRILLDOWN_DIALOG_CONTENT_CLASS`. Same for `GiftCardManager`'s create dialog (line 130: bare `<DialogContent>`). Both should use the shared drilldown class for animation consistency and sidebar offset.

**Fix:** Apply `DRILLDOWN_DIALOG_CONTENT_CLASS` + `style={{ left: 'calc(50% + var(--sidebar-offset, 0px))' }}` to both.

### 3. `RefundDialog` doesn't close on mutation error — user left in limbo (Medium)

`handleSubmit` calls `processRefund.mutateAsync()` without try/catch. If the mutation throws, the dialog stays open but `isPending` flips back to false with no error feedback visible in the dialog itself (toast may appear behind the overlay). The user sees an enabled "Process Refund" button but doesn't know what failed.

**Fix:** Wrap in try/catch. On error, keep dialog open and show inline error message (or rely on toast but confirm it appears above the dialog z-index).

### 4. Payment filter uses `ilike` on raw string — "card" matches "Gift Card" (Medium)

`useGroupedTransactions` line 73: `query.ilike('payment_method', '%card%')` when `paymentFilter === 'card'`. This matches `Credit`, `Cash`, `Appointment Deposit`, and any `Gift Card` entries too since they all contain substrings loosely. Actually checking the data, payment values are `Credit`, `Cash`, `Credit;Credit`, `Credit;Cash`, `Credit;Appointment Deposit`. Filtering for `card` would match nothing (none contain "card" literally). Filtering for `cash` correctly matches `Cash` and `Credit;Cash`.

The filter dropdown offers "Card" but the actual data uses "Credit" — so selecting "Card" returns zero results.

**Fix:** Map the UI filter value to the actual data value. "Card" → `ilike '%Credit%'`, "Cash" → `ilike '%Cash%'`. Or better: derive unique payment methods from data and use those as filter options.

### 5. `TillBalanceSummary` tip not included in total display (Low)

`TillBalanceSummary` uses `txn.totalAmount` (which is `subtotal + tax`) but doesn't add `tipAmount`. The detail sheet and receipt both show `totalAmount + tipAmount` as the grand total. The till balance should be consistent — it currently understates by the tip amount.

Whether tips belong in "till balance" is a business decision, but the inconsistency between the detail sheet total and the summary total is confusing.

**Fix:** Either add tipAmount to the till balance total (matching the receipt), or explicitly label the till balance as excluding tips and show tips as a separate line.

### 6. `GiftCardManager` uses `font-medium` on table cells (Low — Canon)

Line 245, 249: `<TableCell className="font-medium">` for amounts. Per canon, `font-medium` is max allowed weight, so this is technically fine, but these should use `tokens.body.emphasis` for consistency rather than raw `font-medium`.

### 7. Search input causes a query on every keystroke (Low)

`searchQuery` state drives `useGroupedTransactions` filters directly. Every character typed fires a new Supabase query. Should debounce the search input (300-500ms) to reduce unnecessary requests.

**Fix:** Add a `useDeferredValue` or `useDebounce` wrapper around `searchQuery` before passing to `filters.clientSearch`.

### 8. `printReceipt` popup-blocked fallback missing (Carried from Round 2)

Still no fallback when `window.open` returns `null`. The function silently fails with `if (!win) return;`. Should show a toast: "Popup blocked — please allow popups for this site."

**Fix:** Add `toast.error(...)` in the `!win` branch.

### 9. KPI "Total Revenue" doesn't include tip — inconsistent with detail sheet (Observation)

KPIs compute `totalRevenue = activeTxns.reduce((sum, t) => sum + t.totalAmount, 0)` where `totalAmount = subtotal + tax`. The detail sheet and receipt show `totalAmount + tipAmount` as the grand total. This means the KPI "Total Revenue" excludes tips, which is arguably correct for revenue reporting, but the label doesn't clarify this. A tooltip like "Excludes tips" would prevent confusion.

## Summary

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **Medium** | Actions hidden for pending refunds | Change guard from `!refundStatus` to `refundStatus !== 'completed'` |
| 2 | **Low** | IssueCreditsDialog + GiftCard create dialog missing drilldown class | Apply `DRILLDOWN_DIALOG_CONTENT_CLASS` |
| 3 | **Medium** | RefundDialog no error handling on mutateAsync | Add try/catch |
| 4 | **Medium** | Payment "Card" filter matches nothing (data uses "Credit") | Map filter values to actual data values |
| 5 | **Low** | Till balance excludes tips; detail sheet includes them | Add tip line or tooltip clarification |
| 6 | **Low** | GiftCardManager raw `font-medium` instead of token | Use `tokens.body.emphasis` |
| 7 | **Low** | Search fires query on every keystroke | Debounce input |
| 8 | **Low** | printReceipt fails silently when popup blocked | Add toast fallback |
| 9 | **Low** | KPI "Total Revenue" excludes tips without labeling | Add MetricInfoTooltip |

### Files to edit

| File | Changes |
|------|---------|
| `TransactionDetailSheet.tsx` | Fix action guard for pending refunds |
| `IssueCreditsDialog.tsx` | Apply drilldown dialog class |
| `GiftCardManager.tsx` | Apply drilldown dialog class + use tokens for font-medium |
| `RefundDialog.tsx` | Add try/catch around mutateAsync |
| `useGroupedTransactions.ts` | Fix payment method filter mapping (card → Credit) |
| `Transactions.tsx` | Debounce search input; add tooltip to KPI; update payment filter options |
| `TillBalanceSummary.tsx` | Include tip in total or label as excluding tips |
| `ReceiptPrintView.tsx` | Add toast on popup blocked |

