

# Add Waive Action to Pending Fee Rows

## Problem

The Fee Ledger card on Payment Operations shows pending fees but provides no way to act on them. Operators must leave this page to waive fees, breaking the workflow. The `appointment_fee_charges` table already has `waived_by` and `waived_reason` columns ready to use.

## Changes

### 1. `src/pages/dashboard/admin/PaymentOps.tsx` — FeeLedgerCard

**Add an "Actions" column** to the table (visible only on the "pending" tab):

- New column header: "Actions"
- Each pending row gets a "Waive" button (`tokens.button.inline`, destructive variant)
- Clicking opens an `AlertDialog` with:
  - Title: "Waive Fee Charge"
  - Description showing client name + amount for confirmation
  - A required text input for `waived_reason`
  - Cancel + Confirm buttons
- On confirm: mutation updates `appointment_fee_charges` set `status = 'waived'`, `waived_by = auth.uid()`, `waived_reason = input`
- On success: invalidate `['fee-ledger', ...]` and `['fee-ledger-pending-count', ...]` query keys, show toast
- The Actions column is hidden for "collected" and "waived" tabs

**State additions**: `waiveDialogOpen`, `selectedChargeId`, `waiveReason` — managed via `useState` inside `FeeLedgerCard`.

**Mutation**: inline `useMutation` or a small helper — updates single row by ID, scoped to `organization_id`.

### 2. No other files affected

The TeamHub pending count badge auto-updates since it queries the same table.

## Technical Notes

- Uses existing `AlertDialog` components already imported in PaymentOps.tsx
- `waived_by` populated from `supabase.auth.getUser()` at mutation time
- Destructive actions protected by mandatory confirmation dialog per security doctrine
- No migration needed — all columns exist

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/PaymentOps.tsx` | Add waive action button + AlertDialog to pending fee rows |

0 migrations, 0 new edge functions, 0 new dependencies.

