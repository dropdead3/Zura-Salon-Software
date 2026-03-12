

## Smart Inventory Reordering System

This is a multi-layer feature spanning database, edge function (AI-powered suggestions), hooks, and UI changes to the Inventory tab.

### 1. Database: New Tables

**`product_suppliers`** — Stores supplier info per product.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID FK → products | |
| organization_id | UUID FK → organizations | |
| supplier_name | TEXT NOT NULL | |
| supplier_email | TEXT | For email reorders |
| supplier_phone | TEXT | |
| supplier_website | TEXT | |
| reorder_method | TEXT | 'email', 'phone', 'website', 'manual' |
| reorder_notes | TEXT | Free-text instructions |
| lead_time_days | INT | Expected delivery time |
| account_number | TEXT | Account # with supplier |
| created_at / updated_at | TIMESTAMPTZ | |

RLS: org-member read/write via `is_org_member`.

**`purchase_orders`** — Tracks reorder requests.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK → organizations | |
| product_id | UUID FK → products | |
| supplier_name | TEXT | Snapshot from supplier at creation |
| supplier_email | TEXT | |
| quantity | INT NOT NULL | |
| unit_cost | NUMERIC | From product.cost_price |
| total_cost | NUMERIC | |
| status | TEXT | 'draft', 'sent', 'confirmed', 'received', 'cancelled' |
| notes | TEXT | |
| created_by | UUID FK → auth.users | |
| sent_at | TIMESTAMPTZ | |
| expected_delivery_date | DATE | |
| received_at | TIMESTAMPTZ | |
| created_at / updated_at | TIMESTAMPTZ | |

RLS: org-member read/write via `is_org_member`.

**Add columns to `products`**:
- `supplier_id UUID` FK → product_suppliers (optional convenience link)

### 2. Edge Function: `suggest-reorder-quantity`

Uses Lovable AI (Gemini Flash) to analyze sales velocity from `phorest_transaction_items` for a given product and return a suggested reorder quantity.

- Input: `product_id`, `organization_id`
- Logic:
  1. Query last 90 days of transaction items matching the product name/SKU
  2. Calculate: avg daily sales, trend direction, current stock, min stock level, supplier lead time
  3. Send to AI with a structured tool-call schema requesting `{ suggested_quantity, reasoning, confidence }`
- Output: JSON with suggestion + reasoning

### 3. Edge Function: `send-reorder-email`

Generates and sends a purchase order email to the supplier using `sendOrgEmail`.

- Input: `purchase_order_id`
- Logic: Fetch PO + product + supplier details, format a professional reorder email, send via existing email infrastructure
- Updates PO status to 'sent' and sets `sent_at`

### 4. Hooks

**`useProductSuppliers`** — CRUD for product_suppliers table.

**`usePurchaseOrders`** — Query/create/update purchase orders, filtered by org.

**`useReorderSuggestion(productId)`** — Calls the edge function, returns suggested quantity + reasoning.

### 5. UI Changes: Inventory Tab

**Inventory table enhancements:**
- Add "Suggested Reorder" column showing AI-calculated quantity (lazy-loaded per row or batch)
- Add "Supplier" column showing supplier name (truncated) or "—"
- Add "Reorder" action button per row (replaces or augments current Adjust column for low-stock items)

**Reorder dialog** (triggered by clicking Reorder button):
- Shows product name, current stock, min stock, AI-suggested quantity (with reasoning tooltip)
- Editable quantity field (pre-filled with suggestion)
- Supplier info summary (name, method, email)
- Two actions:
  - **Create Purchase Order** — saves as draft
  - **Send to Supplier** — creates PO + sends email in one step
- If no supplier configured, prompts to add one first

**Supplier management dialog** (from product edit form or inventory row):
- Add/edit supplier details: name, email, phone, website, reorder method, lead time, account number
- Accessible from product edit dialog (new "Supplier" section) and from inventory row action menu

**Purchase Orders panel** (new sub-section or tab):
- List of POs with status badges (draft → sent → confirmed → received)
- Click to view details, mark as received (auto-updates stock quantity)
- Filter by status

### 6. Files Created/Modified

| File | Action |
|------|--------|
| Migration SQL | Create `product_suppliers`, `purchase_orders` tables + RLS |
| `supabase/functions/suggest-reorder-quantity/index.ts` | New edge function |
| `supabase/functions/send-reorder-email/index.ts` | New edge function |
| `src/hooks/useProductSuppliers.ts` | New hook |
| `src/hooks/usePurchaseOrders.ts` | New hook |
| `src/hooks/useReorderSuggestion.ts` | New hook |
| `src/components/dashboard/settings/inventory/ReorderDialog.tsx` | New component |
| `src/components/dashboard/settings/inventory/SupplierDialog.tsx` | New component |
| `src/components/dashboard/settings/inventory/PurchaseOrdersPanel.tsx` | New component |
| `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` | Modify InventoryByLocationTab |
| `src/hooks/useProducts.ts` | Add supplier_id to Product interface |

