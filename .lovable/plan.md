

# PO Numbering, Delivery Tracking, and Reorder Analytics

## 1. Auto-Generated PO Numbers

The `po_number` column already exists on `purchase_orders` (nullable TEXT). We need a database sequence + trigger to auto-populate it on INSERT.

**Database migration:**
- Create a sequence `po_number_seq` per-org using a trigger approach
- Create a trigger function `generate_po_number()` that sets `po_number = 'PO-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval(...)::text, 4, '0')` on INSERT when `po_number IS NULL`
- Use a single global sequence for simplicity (org prefix not needed since POs are already org-scoped)

**UI changes:**
- `OrdersTab.tsx`: Replace `po.id.slice(0, 8).toUpperCase()` with `po.po_number || po.id.slice(0,8)` in the PO # column
- `ReceiveTab.tsx`: Already uses `getPoLabel()` which handles this
- `generatePurchaseOrderPdf.ts`: Include `po_number` in the PDF header

---

## 2. Delivery Date Tracking with Supplier Confirmation

Columns `expected_delivery_date` and `supplier_confirmed_at` already exist on `purchase_orders`.

**Database migration:**
- Add `supplier_confirmed_delivery_date TIMESTAMPTZ` column to `purchase_orders` (the supplier's confirmed date, distinct from the buyer's expected date)
- Add `delivery_followup_sent_at TIMESTAMPTZ` column for tracking when reminders were sent

**UI changes in `OrdersTab.tsx`:**
- Add an inline editable expected delivery date field in the expanded PO row
- Show supplier-confirmed date when available
- Add a "Follow Up" button on sent POs that are past their expected delivery date

**Edge function:** `check-po-delivery-reminders` (cron, daily)
- Query sent POs where `expected_delivery_date < now()` and `received_at IS NULL` and `delivery_followup_sent_at IS NULL` (or last sent > 3 days ago)
- Send reminder email to supplier via existing email infrastructure
- Update `delivery_followup_sent_at`

---

## 3. Reorder History Analytics Tab

Add a 7th tab "Analytics" to the inventory workspace showing ordering patterns and cost trends.

**New component:** `src/components/dashboard/backroom-settings/inventory/ReorderAnalyticsTab.tsx`

**New hook:** `src/hooks/backroom/useReorderAnalytics.ts`
- Queries `purchase_orders` + `purchase_order_lines` for the last 6 months
- Aggregates: monthly spend by supplier, order frequency by product, avg cost per unit trends

**UI sections:**
1. **KPI cards**: Total POs (period), Total Spend, Avg Order Value, Avg Lead Time
2. **Monthly Spend by Supplier** chart (bar chart using existing charting patterns)
3. **Top Reordered Products** table (product, order count, total units, total spend, avg unit cost trend)
4. **Supplier Performance** table (supplier, PO count, avg lead time, on-time %)

**Integration:**
- Add "Analytics" tab with `BarChart3` icon to `BackroomInventorySection.tsx`

---

## Files to create/modify

| File | Action |
|------|--------|
| Database migration | Create sequence + trigger for `po_number`, add delivery tracking columns |
| `OrdersTab.tsx` | Show `po_number`, add delivery date editing, follow-up button |
| `ReorderTab.tsx` | Pass `po_number` context where POs are created |
| `generatePurchaseOrderPdf.ts` | Include `po_number` in PDF |
| `BackroomInventorySection.tsx` | Add 7th "Analytics" tab |
| `ReorderAnalyticsTab.tsx` (new) | Analytics dashboard component |
| `useReorderAnalytics.ts` (new) | Data aggregation hook |
| `check-po-delivery-reminders/index.ts` (new) | Daily cron edge function for follow-up emails |

