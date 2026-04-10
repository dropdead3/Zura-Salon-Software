

# Transactions Page Audit — Round 4

## Critical Bug

### 1. Refund will crash for any non-walk-in transaction — UUID vs text type mismatch

`refund_records.client_id` column is type `uuid`. But `phorest_transaction_items.phorest_client_id` stores text strings like `EtPBfY8e6OZJnll38KdapQ` (not UUIDs). The refund adapter in `TransactionDetailSheet` passes `transaction.phorestClientId` (text) directly to `useProcessRefund`, which inserts it into the `uuid` column. Postgres will reject this with a type error on every refund for a client-linked transaction.

**Fix:** Change `refund_records.client_id` column from `uuid` to `text` via migration. Alternatively, resolve the phorest client ID to a real UUID from a clients/profiles table before inserting — but since the entire transaction system uses phorest IDs as text, changing the column type is simpler and consistent.

## Medium Bugs

### 2. `IssueCreditsDialog.handleSubmit` has no try/catch — unhandled rejection on failure

Line 75: `await issueCredit.mutateAsync(...)` with no try/catch. If the mutation fails, the promise rejects unhandled and `onOpenChange(false)` on line 83 never fires, but no error feedback appears in-dialog either (toast fires from the hook but may be behind the overlay).

**Fix:** Wrap in try/catch like `RefundDialog` already does.

### 3. `GiftCardManager.handleCreate` has no try/catch — same issue

Line 69: `await createGiftCard.mutateAsync(...)` with no try/catch. On failure, `setIsCreateOpen(false)` and state resets on lines 76-79 never execute, but no inline error is shown.

**Fix:** Wrap in try/catch; only close dialog and reset state on success.

### 4. GiftCard table headers missing `tokens.table.columnHeader`

`GiftCardManager` lines 200-207: raw `<TableHead>Code</TableHead>` etc. without the `tokens.table.columnHeader` class. Per canon, all table column headers must use this token (Aeonik Pro, Title Case, never uppercase).

**Fix:** Apply `className={tokens.table.columnHeader}` to all `<TableHead>` elements.

### 5. GiftCard stats cards missing `BlurredAmount` on "Outstanding Balance"

Line 109: `{formatCurrency(totalValue)}` is not wrapped in `BlurredAmount`. All monetary values must respect the hide-numbers toggle.

**Fix:** Wrap in `<BlurredAmount>`.

### 6. `Appointment Deposit` payment type classified as "card" by default

`classifySegment` in `PaymentMethodBadge` falls through to `return 'card'` for "appointment deposit" since it doesn't match cash, card, credit, debit, voucher, or gift. This misclassifies deposit-type payments. A transaction with `Credit;Appointment Deposit` is correctly classified as "split," but `Appointment Deposit` alone would show as "card" which is wrong.

**Fix:** Add `deposit` classification: `if (s.includes('deposit')) return 'deposit'`. Add corresponding icon and style entries.

### 7. Refund button visible to non-leadership users

The Void button is correctly gated behind `isLeadership` (line 292-302 of `TransactionDetailSheet`). But the Refund button (line 283-291) is shown to ALL authenticated users. Refunds should also be leadership-gated, or at minimum have a separate permission check.

**Fix:** Gate the Refund button behind `isLeadership` as well (or a dedicated `canRefund` check).

## Low Severity

### 8. Receipt XSS vulnerability — client/item names injected as raw HTML

`ReceiptPrintView` interpolates `transaction.clientName`, `transaction.stylistName`, and `item.itemName` directly into HTML strings without escaping. A client named `<script>alert('xss')</script>` would execute in the print popup.

**Fix:** Create a simple `escapeHtml` utility and use it on all interpolated values.

### 9. `GiftCardManager` search not debounced

`searchCode` state filters the gift cards list on every keystroke. With a small dataset this is fine, but it's inconsistent with the debounced search on the main transactions tab.

**Fix:** Apply `useDebounce` for consistency (low priority since filtering is client-side).

## Summary

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **Critical** | `refund_records.client_id` is uuid but receives text phorest IDs | Migrate column to `text` |
| 2 | **Medium** | IssueCreditsDialog no try/catch on mutateAsync | Add try/catch |
| 3 | **Medium** | GiftCardManager.handleCreate no try/catch | Add try/catch |
| 4 | **Medium** | GiftCard table headers missing column header tokens | Apply `tokens.table.columnHeader` |
| 5 | **Medium** | Outstanding Balance not wrapped in BlurredAmount | Add BlurredAmount wrapper |
| 6 | **Low** | "Appointment Deposit" misclassified as "card" | Add deposit classification |
| 7 | **Medium** | Refund button not permission-gated | Gate behind isLeadership |
| 8 | **Low** | Receipt HTML injection vulnerability | Escape interpolated values |
| 9 | **Low** | GiftCard search not debounced | Apply useDebounce |

### Files to edit

| File | Changes |
|------|---------|
| **Migration SQL** | `ALTER TABLE refund_records ALTER COLUMN client_id TYPE text` |
| `IssueCreditsDialog.tsx` | Add try/catch around mutateAsync |
| `GiftCardManager.tsx` | Add try/catch; apply `tokens.table.columnHeader`; wrap balance in `BlurredAmount` |
| `PaymentMethodBadge.tsx` | Add deposit classification + icon/style |
| `TransactionDetailSheet.tsx` | Gate Refund button behind `isLeadership` |
| `ReceiptPrintView.tsx` | Add `escapeHtml` utility and escape all interpolated values |

