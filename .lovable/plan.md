

# Audit: Appointments & Transactions Hub vs Payment Operations

## Overlap Analysis

| Content Area | Appointments Hub | Payment Ops | Overlap? |
|---|---|---|---|
| Daily transactions table | Yes (Till Transactions sub-tab) | No | No overlap |
| KPI tiles (Revenue, Avg Ticket, Tips) | Yes | No | No overlap |
| Till Balance Summary bar | Yes (bottom of transactions) | No (but Reconciliation tab compares against Stripe) | **Partial** — Till Balance bar shows cash/card split; Reconciliation tab verifies card totals against Stripe. Complementary, not duplicate. |
| Till Reconciliation | No (only a "Reconcile" CTA link) | Yes (full tool) | **Cross-link exists** — TillBalanceSummary already navigates to PaymentOps with date param |
| Deposit Holds | No | Yes | No overlap |
| Pending Refunds | No | Yes | No overlap |
| Fee Charges (cancellation/no-show) | No | Yes | No overlap |
| Payouts & Balance | No | Yes | No overlap |
| Gift Cards | Yes (sub-tab) | No | No overlap |
| Petty Cash (placeholder) | Yes (sub-tab) | No | No overlap |

**Verdict**: There is no duplicated content. The only connection point is the existing "Reconcile" button on TillBalanceSummary that links to Payment Ops. The two pages are cleanly separated by persona (front-desk vs admin).

## Proposed Cross-Linking Plan

### 1. Payment Ops → Transactions (new)
In the **Reconciliation** tab, after a reconciliation run shows totals, add a subtle link: "View transactions for this date" that navigates to `/dashboard/appointments-hub?tab=transactions&date={selectedDate}`. This lets admins quickly inspect the source transaction data when investigating discrepancies.

### 2. Payment Ops Refunds tab → Transaction Detail (new)
Each pending refund row shows `original_item_name` but has no link back to the originating transaction. Add a "View Original" icon button that opens the Appointments Hub transactions tab filtered to the original transaction date (derivable from `created_at` or a future `original_transaction_date` column).

### 3. Transactions → Refund Status Indicator (new)
In `GroupedTransactionTable`, transactions with an associated refund record should show a small badge ("Refunded" / "Refund Pending"). Clicking the badge navigates to Payment Ops Refunds tab. This surfaces refund state without duplicating the refund queue.

### 4. Transactions → Fee Charge Indicator (new)
Transactions tied to appointments that have a pending fee charge (cancellation/no-show) should show a small "Fee Pending" badge. Clicking navigates to Payment Ops Fee Charges tab.

### 5. Keep existing cross-link (no change)
The TillBalanceSummary "Reconcile" button already navigates to Payment Ops with the selected date. No changes needed.

## Files to Modify

| File | Change |
|---|---|
| `src/pages/dashboard/admin/PaymentOps.tsx` | Add "View transactions" link in Reconciliation tab results |
| `src/components/dashboard/transactions/GroupedTransactionTable.tsx` | Add refund status badge with link to Payment Ops |
| `src/components/dashboard/transactions/GroupedTransactionTable.tsx` | Add fee-pending badge with link to Payment Ops |
| `src/pages/dashboard/admin/PaymentOps.tsx` | Add "View Original" link on refund rows |
| `src/pages/dashboard/AppointmentsHub.tsx` | Accept `date` search param to pre-set transaction date from inbound links |

No migrations. No edge functions. No new dependencies.

## Summary

The two pages have zero duplicate content — they serve different personas with complementary data. The cross-linking plan adds 4 contextual navigation points that connect related records across the two surfaces without merging or duplicating anything.

