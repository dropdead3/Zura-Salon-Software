

## Batch Reorder by Supplier + Automated Low-Stock Alerts

### What This Adds

1. **Batch reorder** — Select multiple low-stock items, auto-group them by supplier, and create one PO per supplier (or send one email per supplier) in a single action.
2. **Automated reorder alerts** — A scheduled edge function (`check-reorder-levels`) runs daily, detects products below min stock, and creates platform notifications (using the existing `createNotification` throttling).
3. **Supplier-aware PO grouping** — The Purchase Orders panel groups by supplier, and the batch reorder flow intelligently clusters items per supplier.

### Changes

**1. New Edge Function: `supabase/functions/check-reorder-levels/index.ts`**
- Runs via cron (daily at 7am)
- Queries all products where `quantity_on_hand <= reorder_level` and `is_active = true`
- Groups low-stock products by organization
- For each org, creates a `createNotification` alert (type: `low_stock_alert`, 120min cooldown) listing the product names
- Optionally auto-creates draft POs for items that have a supplier configured but no open (draft/sent/confirmed) PO

**2. Cron job setup** (via insert tool, not migration)
- Schedule `check-reorder-levels` daily at 7am UTC
- Add `check-reorder-levels` to `ALLOWED_FUNCTIONS` in `trigger-scheduled-job`

**3. New Component: `src/components/dashboard/settings/inventory/BatchReorderDialog.tsx`**
- Receives list of selected low-stock products + supplier map
- Groups products by supplier (using `product_suppliers` table)
- Shows a grouped view: each supplier section lists their products with AI-suggested quantities (or manual entry)
- Products with no supplier are shown in an "Unassigned" group with a prompt to assign one
- Two bulk actions: "Save All as Drafts" and "Send All to Suppliers"
- Calls `useCreatePurchaseOrder` once per product (or a new batch mutation)

**4. New Hook: `src/hooks/useBatchReorder.ts`**
- `useBatchCreatePurchaseOrders()` — accepts array of PO create params, inserts all, optionally invokes `send-reorder-email` for each with a supplier email
- Returns progress state for UI feedback

**5. Modify `send-reorder-email/index.ts`**
- Accept optional `purchase_order_ids` (array) in addition to single `purchase_order_id`
- When array provided, fetch all POs for the same supplier, combine into one email with a multi-row product table
- This way one email per supplier covers all their products

**6. UI Changes in `RetailProductsSettingsContent.tsx` — `InventoryByLocationTab`**
- Add checkbox column to inventory table for row selection
- Add "Batch Reorder" button in the low-stock alert banner (and toolbar) — disabled when no rows selected
- Clicking opens `BatchReorderDialog` with selected products
- Auto-select all low-stock items button

**7. Modify `PurchaseOrdersPanel.tsx`**
- Add "Group by Supplier" toggle
- When enabled, POs render under supplier name headers with subtotals

### File Summary

| File | Action |
|------|--------|
| `supabase/functions/check-reorder-levels/index.ts` | New — daily cron for low-stock alerts |
| `supabase/functions/trigger-scheduled-job/index.ts` | Add to ALLOWED_FUNCTIONS |
| `supabase/functions/send-reorder-email/index.ts` | Support batch (multi-product) emails |
| `src/components/dashboard/settings/inventory/BatchReorderDialog.tsx` | New — batch reorder grouped by supplier |
| `src/hooks/useBatchReorder.ts` | New — batch PO creation mutation |
| `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` | Add checkboxes + batch reorder button |
| `src/components/dashboard/settings/inventory/PurchaseOrdersPanel.tsx` | Add supplier grouping toggle |
| SQL insert (not migration) | Cron job schedule for `check-reorder-levels` |

