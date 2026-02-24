
## Fix: Retail Attachment Rate Calculation

### Root Cause

The `useRetailAttachmentRate` hook matches service and product records by `transaction_id`. However, in Phorest's data model, services and retail products are recorded under **separate transaction IDs** even when purchased by the same client on the same visit. This means the current logic finds zero overlaps, resulting in a permanent 0% attachment rate.

Database evidence confirms this:
- 0 shared `transaction_id` values between service and product rows
- But many shared `phorest_client_id + transaction_date` pairs exist (clients who bought both service and retail on the same day)

### Fix

**File: `src/hooks/useRetailAttachmentRate.ts`**

Change the matching key from `transaction_id` to `phorest_client_id + transaction_date` (same client on the same day = one "visit"):

1. Query service items selecting `phorest_client_id` and `transaction_date` (instead of `transaction_id`)
2. Query product items selecting `phorest_client_id` and `transaction_date`
3. Build a Set of `clientId|date` composite keys for service visits
4. Build a Set of `clientId|date` composite keys for product purchases
5. Count service visits where the client also purchased a product on the same day

This gives a true "client-visit-level" attachment rate: of all client visits that included a service, what percentage also included a retail purchase?

### Also Fix

**File: `src/hooks/useServiceRetailAttachment.ts`**

This hook has the same `transaction_id`-based join issue for the per-service breakdown. Apply the same client+date matching logic:
- Group service items by `item_name`, collecting `clientId|date` composite keys per service
- Match against product purchases by `clientId|date` to determine which service visits also had retail

### No Changes Needed

- `RevenueDonutChart.tsx` -- already receives the rate as a prop, no logic changes
- `AggregateSalesCard.tsx` -- already passes attachment data correctly
- Database schema -- no migrations needed, `phorest_client_id` and `transaction_date` columns already exist

### Technical Details

The composite key format will be `${phorest_client_id}|${transaction_date}` to create a unique visit identifier. Rows with null `phorest_client_id` will be excluded (they cannot be matched to a visit).
