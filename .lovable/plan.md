

## Transaction Breakdown & Refund Wizard in Appointment Detail Drawer

### Analysis of Current State

**Data structure:** `phorest_transaction_items` stores one row per line item, each with its own `transaction_id`. Items for the same visit share `phorest_client_id + transaction_date`. Key fields per row: `item_name`, `item_type` (service, product, sale_fee, appointment_deposit, special_offer_item, outstanding_balance_pmt), `unit_price`, `discount`, `total_amount`, `tax_amount`, `tip_amount` (visit-level, duplicated across rows), `payment_method`.

**Tip duplication:** The `tip_amount` column is identical across all items in the same visit -- it must be deduplicated (take `MAX` or first value, not `SUM`).

**Existing infrastructure:** `useRefunds.ts` already has `useProcessRefund` supporting three refund types (original_payment, salon_credit, gift_card) with automatic balance crediting via `add_to_client_balance` RPC. The `refund_records` table stores per-item refund history.

**Current drawer:** The `AppointmentDetailDrawer` already fetches promo info from transaction items but does not show the full transaction breakdown. No refund UI exists in the drawer.

---

### Plan

#### 1. New Hook: `useAppointmentTransactionBreakdown`

**File:** `src/hooks/useAppointmentTransactionBreakdown.ts`

Fetches all `phorest_transaction_items` matching the appointment's `phorest_client_id + appointment_date`. Also fetches any existing `refund_records` for those transaction IDs.

Returns a structured breakdown:
```text
{
  items: [{ id, itemName, itemType, unitPrice, discount, totalAmount, taxAmount, paymentMethod, transactionId }],
  summary: {
    servicesTotal, productsTotal, feesTotal, depositsTotal,
    discountTotal, taxTotal, tip, grandTotal, paymentMethods: string[]
  },
  refunds: RefundRecord[],   // existing refunds for these transaction IDs
  hasTransaction: boolean
}
```

Key logic:
- Tip is deduplicated: `MAX(tip_amount)` across all items
- Items categorized by `item_type` into services, products, fees (sale_fee), deposits (appointment_deposit), other
- Grand total = SUM(total_amount) + tip + tax (if tax not already included in total_amount -- need to verify; data shows tax=0 for services and tax>0 for products separately)
- Existing refunds fetched from `refund_records` via `original_transaction_id IN [transactionIds]`

#### 2. New Component: `TransactionBreakdownPanel`

**File:** `src/components/dashboard/appointments-hub/TransactionBreakdownPanel.tsx`

Renders inside a new "Transaction" tab in the detail drawer. Sections:

```text
┌────────────────────────────────────────┐
│  SERVICES                              │
│  ├ Single Process Color    $140 → $70  │  (discount shown inline)
│  ├ Glaze Add On            $50  → $25  │
│  FEES                                  │
│  ├ Vish (color charge)          $21.51 │
│  PRODUCTS                              │
│  ├ Dry Texture Spray            $25.00 │
│  ─────────────────────────────────────│
│  Subtotal                      $141.51 │
│  Discounts                     -$95.00 │
│  Tax                             $2.08 │
│  Tip                            $23.75 │
│  ─────────────────────────────────────│
│  Total Paid                   $167.34  │
│  Paid via: Credit Card                 │
│                                        │
│  [Refund]  ← opens wizard              │
└────────────────────────────────────────┘
```

- All monetary values wrapped in `<BlurredAmount>`
- Discounted items show strikethrough on original price
- Existing refunds shown below with status badges
- Empty state when no transaction data exists

#### 3. New Component: `RefundWizard`

**File:** `src/components/dashboard/appointments-hub/RefundWizard.tsx`

Multi-step dialog opened from the Transaction panel:

**Step 1 -- Select What to Refund:**
- Checkboxes for each line item (pre-filled amounts)
- Quick actions:
  - "Refund All" -- selects all items at full amount
  - "Refund All Less Fees" -- selects all except `sale_fee` items
  - "Refund Services Only" -- selects only `service` type items
- Per-item override: percentage slider OR manual dollar amount input
- Running total updates live

**Step 2 -- Refund Method:**
- Original payment method (flags for PhorestPay processing -- status: pending)
- Salon credit (auto-applied to client balance -- status: completed)
- Gift card balance (auto-applied to client balance -- status: completed)

**Step 3 -- Reason & Confirm:**
- Reason dropdown: Service dissatisfaction, Pricing error, Duplicate charge, Cancellation, Other
- Optional notes textarea
- Summary card showing: items being refunded, amounts, method, total
- Confirm button

**Refund submission** uses existing `useProcessRefund` hook. For multi-item refunds, creates one `refund_record` per selected item (preserves per-item audit trail).

**Guard rails:**
- Cannot refund more than original item amount
- Cannot refund an item that already has a completed refund (checks existing refund_records)
- Tip refund is a separate explicit toggle (not auto-included)
- Tax refund is proportionally calculated based on refunded item amounts

#### 4. Update `AppointmentDetailDrawer`

**File:** `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx`

- Add "Transaction" tab between "Summary" and "Notes"
- Tab shows badge with item count when transaction data exists
- Renders `TransactionBreakdownPanel` which conditionally renders `RefundWizard` in a Dialog

#### 5. Gaps Identified & Addressed

| Gap | Resolution |
|---|---|
| Tip is duplicated across rows | Deduplicate via MAX in the breakdown hook |
| No per-item refund tracking | Each refund creates a separate `refund_records` row per item |
| Tax proportionality on partial refunds | Calculate `(refundedItemTotal / totalBeforeTax) × totalTax` |
| Refund of fees (Vish, etc.) | "Refund All Less Fees" quick action explicitly excludes `sale_fee` items |
| Double-refund prevention | Check existing `refund_records` for each `transaction_id` before allowing |
| Tip refund | Explicit toggle, separate from item refunds, creates its own refund record |
| Organization context needed for refund | Resolved from appointment's `location_id` → `locations.organization_id` |
| `client_id` for refund_records expects UUID (phorest_clients.id) | Resolve `phorest_client_id` → `phorest_clients.id` (already done in drawer) |

#### 6. Additional Utility Enhancements

- **Refund history badge on appointment row**: When refund_records exist for an appointment's transaction, show a small "Refunded" or "Partial Refund" badge in the appointments table
- **Print/export receipt**: Add a "Copy Receipt" button that copies a plain-text receipt breakdown to clipboard
- **Deposit tracking**: If `appointment_deposit` items exist, show them distinctly with "Deposit applied" label

### Files Created/Modified

| File | Action |
|---|---|
| `src/hooks/useAppointmentTransactionBreakdown.ts` | Create -- data fetching hook |
| `src/components/dashboard/appointments-hub/TransactionBreakdownPanel.tsx` | Create -- breakdown display |
| `src/components/dashboard/appointments-hub/RefundWizard.tsx` | Create -- multi-step refund flow |
| `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` | Modify -- add Transaction tab |

No database changes needed -- existing `refund_records` table and `add_to_client_balance` RPC cover all refund flows.

