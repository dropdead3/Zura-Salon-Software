

## Enhance Transfers Tab — Multi-Product Lines, PDF Export, Notifications

### 1. Multi-Product Transfer Lines

Currently the "New Transfer" dialog allows only one product per transfer. The `useStockTransferLines` hook and `stock_transfer_lines` table already exist but aren't wired up.

**Changes:**

- **`TransfersTab.tsx`** — Rework the "New Transfer" dialog to support adding multiple product rows before submitting:
  - Replace the single product/quantity picker with a "line items" list
  - Each line: product selector + quantity input + remove button
  - "Add Product" button appends a new empty row
  - On submit: create the `stock_transfers` parent row first, then bulk-insert all lines via `useAddTransferLine`
  - The table view shows product count per transfer (e.g. "3 products") with an expandable row or tooltip listing the line items

- **`useStockTransfers.ts`** — Update `useCompleteStockTransfer` to:
  - Fetch all `stock_transfer_lines` for the transfer
  - Call `postTransfer()` for each line (not just the parent row's single `product_id`/`quantity`)
  - This makes the legacy single-product field a fallback — if lines exist, use lines; otherwise fall back to parent row fields

- **`useStockTransferLines.ts`** — Add a `useBulkAddTransferLines` mutation that inserts all lines in one call for the new multi-product flow

### 2. Transfer History PDF Export

Add a "Download PDF" button to the Transfers tab header that generates a formatted transfer history report.

**Changes:**

- **`src/lib/exportTransfersPdf.ts`** (new) — Utility that:
  - Accepts filtered transfers array + location/product maps
  - Uses browser-side PDF generation (same pattern as existing `PdfExportDialog` / inventory PDF exports)
  - Renders: header with org name + date range, table with Date / From→To / Products / Qty / Status / Notes columns
  - Triggers browser download

- **`TransfersTab.tsx`** — Add a `FileDown` icon button next to "New Transfer" that calls the PDF export utility with the current filtered transfer list

### 3. Transfer Request Notifications

When a new transfer is created, notify managers at the destination location so they know inventory is incoming and can approve/complete it.

**Changes:**

- **`useStockTransfers.ts`** — In `useCreateStockTransfer`'s `onSuccess`, invoke a backend function to create a `platform_notification` for destination location managers

- **`supabase/functions/notify-transfer-request/index.ts`** (new edge function) — Receives `{ transferId, organizationId, toLocationId }`, looks up staff assigned to the destination location, and calls `createNotification()` from `_shared/notify.ts` with:
  - `type: 'transfer_request'`
  - `severity: 'info'`
  - `recipient_id` set to each destination location manager
  - Throttling via the existing `createNotification` dedup (60 min cooldown per org+type+title)

### Files Summary

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/inventory/TransfersTab.tsx` | Multi-line product picker in dialog; expandable rows in table; PDF download button |
| `src/hooks/useStockTransfers.ts` | Complete transfer reads lines; invoke notification on create |
| `src/hooks/inventory/useStockTransferLines.ts` | Add `useBulkAddTransferLines` mutation |
| `src/lib/exportTransfersPdf.ts` | New — PDF generation utility for transfer history |
| `supabase/functions/notify-transfer-request/index.ts` | New — edge function to notify destination location managers |

