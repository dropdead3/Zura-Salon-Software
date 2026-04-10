

# Transactions Page Audit — Bugs & Gaps

## Critical Bugs

### 1. `transaction_date` is a DATE, not a TIMESTAMP — Time display is broken
The `phorest_transaction_items.transaction_date` column is type `date` (not `timestamptz`). Every date value is just `2026-02-25` with no time component.

**Impact:**
- **GroupedTransactionTable** renders `new Date(txn.transactionDate).toLocaleTimeString(...)` → shows `12:00 AM` for every single row. The "Time" column is meaningless.
- **useGroupedTransactions** queries with `.gte('transaction_date', '2026-02-25T00:00:00')` and `.lte('transaction_date', '2026-02-25T23:59:59')`. Postgres compares a `date` to a timestamp string — this works but is fragile and semantically wrong.
- **Sorting by date** within a single day is meaningless since all rows have the same date value.
- **ReceiptPrintView** shows time as "12:00 AM" for all receipts.

**Fix:** Query with plain date equality (`.eq('transaction_date', filters.date)`). Remove the "Time" column or replace it with transaction order. If time data becomes available later, migrate the column to `timestamptz`.

### 2. Refund adapter loses multi-item context
Both `Transactions.tsx` (line 72-95) and `TransactionDetailSheet.tsx` (line 91-111) build a mock `TransactionItem` for `RefundDialog` by taking only `items[0]`. This means:
- The refund dialog shows only the first item's name, not the full transaction
- `total_amount` is set to the grouped total but `item_name` is just one item — confusing mismatch
- Partial refunds can't target specific line items

**Fix:** Either refactor `RefundDialog` to accept `GroupedTransaction` directly, or pass the full transaction total with a summary label like "3 items — Cut, Color, Blowout".

### 3. `voided_transactions` RLS mismatch with `phorest_transaction_items` RLS
- `voided_transactions` uses `is_org_member(auth.uid(), organization_id)` for SELECT
- `phorest_transaction_items` uses `has_role(auth.uid(), 'admin')` or `'manager'` or super_admin for SELECT
- A staff member who can see their own transaction items (`stylist_user_id = auth.uid()`) **cannot** see void records because `is_org_member` may not match the same permission model

**Fix:** Align `voided_transactions` SELECT policy to use the same role-based check as `phorest_transaction_items`.

### 4. Void INSERT policy uses `is_org_admin` but the UI doesn't gate it
The `VoidConfirmDialog` allows any authenticated user to attempt voiding. The INSERT will fail silently for non-admins with an RLS error. No UI indication of permission.

**Fix:** Check user role before showing the Void button, or catch the RLS error with a clear "Insufficient permissions" toast.

## Moderate Bugs

### 5. `useGroupedTransactions` doesn't scope by `organization_id`
The main query on `phorest_transaction_items` has **no org filter**. It relies on RLS to scope data, but the void records query explicitly filters by `orgId`. If RLS policies change or are bypassed (e.g., service role), all orgs' data would appear.

**Fix:** Add `.eq('organization_id', orgId)` if the column exists, or document the RLS-only approach explicitly.

### 6. No pagination — potential 1000-row limit hit
`useGroupedTransactions` fetches all items for a date with no `.limit()`. Supabase default limit is 1000 rows. A busy salon day with 200+ transactions averaging 5 items each = 1000+ rows → silently truncated data.

**Fix:** Either paginate, or use `.limit(5000)` with a warning when approaching the cap.

### 7. Date navigation timezone bug
`new Date(selectedDate)` without a time component is parsed as UTC midnight, but `format()` from date-fns uses local timezone. The `goToPreviousDay` / `goToNextDay` use `new Date(selectedDate)` which can shift dates at timezone boundaries.

The page already mitigates this for display with `new Date(selectedDate + 'T12:00:00')` (line 110), but the nav functions (lines 102-107) don't use this pattern.

**Fix:** Use `parseISO(selectedDate)` from date-fns consistently, or always append `T12:00:00`.

## Design & UX Gaps

### 8. `RefundDialog` doesn't use design tokens
- Uses raw `Dialog` without `DRILLDOWN_DIALOG_CONTENT_CLASS`
- Has bare `font-medium` on text (acceptable per canon but not using `tokens.body.emphasis`)
- No `BlurredAmount` wrapping on financial values in the dialog

### 9. Transaction count badge doesn't show on the "Total" SortHeader
The "Total" `SortHeader` renders right-aligned text but the sort button has `-ml-3` which causes slight misalignment in right-aligned columns.

### 10. Missing `Petty Cash` tab
The plan called for a Petty Cash placeholder tab but it wasn't implemented — only "Till Transactions" and "Gift Cards" exist.

### 11. No empty state differentiation
When no data exists for a date, the empty state says "No transactions found" — doesn't distinguish between "no data synced yet" vs "genuinely no sales this day".

### 12. `TillBalanceSummary` doesn't exclude refunded transactions
The till balance sums all non-voided transactions, but refunded transactions (`refundStatus === 'completed'`) should be subtracted or shown separately.

### 13. Detail Sheet doesn't close after void/refund
After voiding from the detail sheet, `VoidConfirmDialog` closes but the parent sheet stays open showing stale data. Same for refund.

## Summary of Fixes

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **Critical** | Time column shows 12:00 AM for all rows | Use date equality query; remove/replace Time column |
| 2 | **Critical** | Refund adapter loses multi-item context | Refactor RefundDialog or pass summary label |
| 3 | **High** | Void/transaction RLS policy mismatch | Align policies |
| 4 | **High** | Void button shown without permission check | Gate UI by role or handle RLS error |
| 5 | **Medium** | No org_id filter on main query | Add explicit filter or document RLS reliance |
| 6 | **Medium** | No pagination, 1000-row silent truncation | Add limit or pagination |
| 7 | **Medium** | Timezone edge case in date navigation | Use parseISO consistently |
| 8 | **Low** | RefundDialog missing design tokens + BlurredAmount | Update styling |
| 9 | **Low** | Sort button misalignment on right-aligned column | Fix negative margin |
| 10 | **Low** | Missing Petty Cash tab placeholder | Add placeholder |
| 11 | **Low** | No empty state differentiation | Improve copy |
| 12 | **Medium** | Till balance doesn't exclude refunds | Subtract refunded amounts |
| 13 | **Medium** | Detail sheet stays open after void/refund | Close sheet on mutation success |

