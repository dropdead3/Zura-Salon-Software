

# Surface Fee Ledger on Payment Operations Page

## Problem

The `CancellationFeeQueueCard` (lines 46-141 in PaymentOps.tsx) queries the `appointments` table directly — filtering by `status IN ('cancelled','no_show')` and `cancellation_fee_status IS NULL OR 'pending'`. This infers fee status from scattered appointment columns rather than using the `appointment_fee_charges` ledger that now serves as the single authoritative source for all fee activity (deposits, no-shows, cancellations, manual charges).

The current card also only shows "pending" fees. It cannot show collected or waived fees, making it impossible to audit fee history from this page.

## Approach

Replace the appointments-table query with a ledger-first approach: query `appointment_fee_charges` joined to `appointments` for context (client name, date, staff). Add a tab or filter toggle to switch between Pending and Collected/Waived views.

## Changes

### 1. Replace `CancellationFeeQueueCard` with `FeeLedgerCard`

**Rename and restructure** the sub-component (lines 46-141):

- **Query source**: `appointment_fee_charges` joined to `appointments` via `appointment_id`
  ```
  SELECT afc.*, a.client_name, a.staff_name, a.appointment_date, a.status
  FROM appointment_fee_charges afc
  JOIN appointments a ON afc.appointment_id = a.id
  WHERE afc.organization_id = orgId
  ORDER BY afc.created_at DESC
  LIMIT 100
  ```
- **Filter tabs**: "Pending" (status = 'pending') | "Collected" (status = 'collected') | "Waived" (status = 'waived') — default to Pending
- **Table columns**: Client, Stylist, Date, Fee Type (deposit/no_show/cancellation/manual), Amount, Collected Via (online_booking/card_on_file), Status badge, Charged At
- **Card title**: "Fee Charges" (broader than just cancellation/no-show)
- **Card icon**: Keep `UserX` or switch to `Receipt` for broader scope
- **Badge count**: Show pending count in header badge

### 2. Update TeamHub stat badge

The `paymentOpsCount` stat (TeamHub.tsx line 271) currently counts pending refunds + active holds. Add pending fee charges count:

```sql
SELECT count(*) FROM appointment_fee_charges
WHERE organization_id = orgId AND status = 'pending'
```

Add this to the combined `paymentOpsCount`.

### 3. Query key

New query key: `['fee-ledger', orgId, statusFilter]`

## Files Summary

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/PaymentOps.tsx` | Replace `CancellationFeeQueueCard` with ledger-backed `FeeLedgerCard` |
| `src/pages/dashboard/admin/TeamHub.tsx` | Add pending fee charges to `paymentOpsCount` |

0 migrations, 0 new edge functions, 0 new dependencies.

