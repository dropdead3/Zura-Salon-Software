

## Tips Data Integrity: Findings and Fixes

### Investigation Results

**Tip Duplication: No Issue Found**
Confirmed via database query -- there are zero transactions where tips are spread across multiple line items within the same transaction. The `useTipsDrilldown` hook correctly sources from `phorest_appointments.tip_amount` (one row per appointment), so tips are not double-counted anywhere.

**Payment Method: Missing from Both Sync Paths**
The `payment_method` column exists on both `phorest_appointments` and `phorest_transaction_items`, but is NULL across all records:
- **CSV path**: The parser extracts `stafftips` but does not look for `paymenttype` or `paymenttypenames` columns
- **API path**: The code maps `purchase.paymentMethod`, but the Phorest API does not appear to return this field in the current data

### Proposed Changes

#### 1. Extract Payment Type from CSV (Sync Engine)

**File: `supabase/functions/sync-phorest-data/index.ts`**

Add `paymenttype` / `paymenttypenames` column detection in the CSV parser (around line 1393):
- Add a new `idxPaymentType` index lookup for columns: `paymenttype`, `paymenttypenames`, `paymentmethod`
- Include the extracted value in the transaction object as `paymentMethod`
- This flows through to `payment_method` on `phorest_transaction_items` during upsert

#### 2. Propagate Payment Method to Appointments

**File: `supabase/functions/sync-phorest-data/index.ts`**

After transaction items are synced, update `phorest_appointments.payment_method` by joining on `phorest_staff_id + transaction_date + phorest_client_id` where the appointment currently has no payment method. This ensures the tips drilldown can show card vs cash breakdown.

Alternatively: query `phorest_transaction_items` in the drilldown hook to get payment method alongside the tip.

#### 3. Add Payment Method Breakdown to Tips Drilldown

**File: `src/hooks/useTipsDrilldown.ts`**

- Add a secondary query against `phorest_transaction_items` to fetch `payment_method` and `tip_amount` for the same date range
- Aggregate tips by payment method (Card, Cash, Other/Unknown)
- Export a new `byPaymentMethod` field: `Record<string, { totalTips: number; count: number }>`

**New UI Component: `TipPaymentMethodBreakdown.tsx`**

- Small donut or horizontal bar showing Card vs Cash vs Unknown tip distribution
- Rendered inside the existing Tips drilldown card
- Follows the donut chart standard (paddingAngle=0, stroke with border color, strokeWidth=1)
- Uses design tokens for typography and layout

### What Does NOT Need Fixing

- **Tip duplication** -- not occurring, verified in database
- **`useTipsDrilldown` data source** -- correctly uses `phorest_appointments`, no change needed for core tip calculation
- **`PayrollKPICards` tips** -- uses payroll analytics hook, separate data path, not affected

### Important Caveat

The payment method extraction depends on whether the Phorest CSV export actually includes `paymenttype` columns. If it does not, the column will remain NULL and the breakdown will show "Unknown" for all tips. A next sync after this change will confirm whether the data populates. The UI will gracefully handle this by showing "Payment method data not yet available" if all values are NULL.

### Technical Sequence

1. Update CSV parser to extract payment type
2. Update transaction-to-appointment payment method propagation
3. Deploy edge function
4. Add `byPaymentMethod` aggregation to `useTipsDrilldown`
5. Create `TipPaymentMethodBreakdown` UI component
6. Trigger a re-sync to populate the data

