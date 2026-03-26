

## Enhance Transfers — Quantity Validation, Receive & Verify, Batch Templates

### 1. Quantity Validation Against Source Stock

**Problem**: Users can currently enter any quantity when creating a transfer, even if the source location doesn't have enough stock.

**Changes:**

- **`TransfersTab.tsx`** — When a "From Location" is selected, fetch that location's inventory via the existing `products` table (`quantity_on_hand`). For each line item in the dialog:
  - Show available stock next to the quantity input (e.g. "Available: 12")
  - Validate that entered quantity ≤ on-hand; highlight the input red and disable "Create Transfer" if exceeded
  - Account for other pending outbound transfers from the same location for the same product (subtract already-pending quantities from available stock)

- **`src/hooks/useStockTransfers.ts`** — Add a `usePendingOutboundQuantities(locationId)` query that sums quantities from pending transfers (and their lines) for each product at a given location. This prevents double-booking.

### 2. Receive & Verify Step

**Problem**: The current "Complete" action assumes the destination received exactly what was sent. In reality, quantities may differ (damage, miscounts).

**Changes:**

- **Database migration** — Add columns to `stock_transfer_lines`:
  - `received_quantity` (integer, nullable, default null)
  - `received_at` (timestamptz, nullable)
  - `discrepancy_notes` (text, nullable)

- **Transfer status flow** — Introduce `in_transit` status between `pending` and `completed`:
  ```text
  pending → in_transit (sender dispatches) → completed (receiver verifies)
  ```
  The existing `status` column already supports any string value.

- **`TransfersTab.tsx`** — Replace the single "Complete" button behavior:
  - Pending transfers show a "Dispatch" button → sets status to `in_transit`
  - `in_transit` transfers show a "Receive & Verify" button → opens a dialog where the destination manager enters actual received quantities per line
  - Pre-fills expected quantities; highlights discrepancies
  - On confirm: updates `received_quantity` on each line, sets status to `completed`, and posts ledger entries using the *received* quantities (not the expected ones)
  - Auto-logs discrepancy notes to the transfer's `notes` field

- **`useStockTransfers.ts`** — Add `useDispatchTransfer` mutation (sets status to `in_transit`) and update `useCompleteStockTransfer` to accept per-line received quantities

- **Status badges** — Add `in_transit` to the badge map with a distinct color (e.g. blue/info variant)

### 3. Batch Transfer Templates

**Problem**: Recurring transfers (e.g. weekly replenishment from warehouse to salon) require re-entering the same products each time.

**Changes:**

- **Database migration** — Create two tables:
  - `transfer_templates`: `id`, `organization_id`, `name`, `from_location_id`, `to_location_id`, `notes`, `created_by`, `created_at`
  - `transfer_template_lines`: `id`, `template_id` (FK), `product_id` (FK), `quantity`, `unit`

- **`src/hooks/inventory/useTransferTemplates.ts`** (new) — CRUD hooks:
  - `useTransferTemplates(orgId)` — list all templates
  - `useCreateTransferTemplate()` — save current dialog state as a template
  - `useDeleteTransferTemplate()`
  - `useTransferTemplateLines(templateId)` — fetch lines for a template

- **`TransfersTab.tsx`** — Two new UI elements:
  - **"Save as Template"** button in the New Transfer dialog footer (after filling products) — saves the current from/to locations and line items as a named template
  - **"From Template"** dropdown/button next to "New Transfer" — lists saved templates; selecting one pre-fills the dialog with the template's locations and products, ready for quantity adjustments and submission

### Files Summary

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/inventory/TransfersTab.tsx` | Validation UI, dispatch/receive flow, template save/load |
| `src/hooks/useStockTransfers.ts` | `usePendingOutboundQuantities`, `useDispatchTransfer`, updated complete with received quantities |
| `src/hooks/inventory/useTransferTemplates.ts` | **New** — template CRUD hooks |
| `src/hooks/inventory/useStockTransferLines.ts` | No changes needed (received_quantity updates go through `useCompleteStockTransfer`) |
| Database migration | Add `received_quantity`, `received_at`, `discrepancy_notes` to `stock_transfer_lines`; create `transfer_templates` + `transfer_template_lines` tables with RLS |

### Status Flow After Changes

```text
pending ──→ in_transit ──→ completed
   │                           ↑
   │                    (receive & verify)
   └──→ cancelled
```

