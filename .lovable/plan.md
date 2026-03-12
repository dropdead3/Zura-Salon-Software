

# Phase 4: Inventory Replenishment & Purchasing — Architecture

## Current State

Already built:
- `product_suppliers` — 1:1 per product, stores supplier_name, email, lead_time_days, moq, avg_delivery_days, delivery_count
- `purchase_orders` — single-product POs with draft→sent→received workflow
- `check-reorder-levels` edge function — batch low-stock detection, auto-creates draft/sent POs
- `send-reorder-email` edge function — sends PO emails grouped by supplier
- `useBatchReorder`, `usePurchaseOrders`, `useMarkPurchaseOrderReceived` hooks
- `inventory_alert_settings` — org-level config for thresholds, auto-reorder, dead stock
- `products.supplier_id` FK to `product_suppliers`

**Key gaps:**
1. No standalone vendor entity — suppliers are duplicated per product (same supplier name repeated across products)
2. No multi-line POs — each PO is 1 product
3. No receiving workflow (partial receipts, inspection, discrepancy logging)
4. No vendor catalog (vendor-specific SKUs, pricing tiers, MOQs)
5. Replenishment engine is embedded in edge function with basic logic — no usage variance, stddev, or safety stock formula
6. No `purchase_order_lines` table

---

## 1. Schema Changes

### 1a. `vendors` (normalize suppliers into a standalone entity)

```sql
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  account_number TEXT,
  payment_terms TEXT,          -- 'net_30', 'net_60', 'cod', 'prepaid'
  default_lead_time_days INT DEFAULT 7,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
-- RLS: org_member SELECT, org_admin ALL
-- Trigger: update_backroom_updated_at
-- Indexes: organization_id
```

### 1b. `vendor_products` (catalog: what each vendor sells)

```sql
CREATE TABLE IF NOT EXISTS public.vendor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_sku TEXT,              -- supplier's own SKU
  unit_cost NUMERIC,            -- vendor price per unit
  moq INT NOT NULL DEFAULT 1,
  pack_size INT DEFAULT 1,      -- units per case
  lead_time_days INT,           -- override vendor default
  is_preferred BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, product_id)
);
-- RLS: org_member SELECT, org_admin ALL
-- Trigger: update_backroom_updated_at
-- Indexes: vendor_id, product_id, organization_id
```

### 1c. `purchase_order_lines` (multi-product POs)

```sql
CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_product_id UUID REFERENCES public.vendor_products(id) ON DELETE SET NULL,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost NUMERIC,
  line_total NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: via parent purchase_order org_member check
-- Index: purchase_order_id, product_id
```

### 1d. `receiving_records` (partial receipt, inspection, discrepancy)

```sql
CREATE TABLE IF NOT EXISTS public.receiving_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'complete', -- 'partial', 'complete', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: org_member SELECT/INSERT, org_admin UPDATE
-- Index: purchase_order_id
```

### 1e. `receiving_record_lines` (per-product receipt quantities)

```sql
CREATE TABLE IF NOT EXISTS public.receiving_record_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_record_id UUID NOT NULL REFERENCES public.receiving_records(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES public.purchase_order_lines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_received INT NOT NULL,
  quantity_damaged INT DEFAULT 0,
  quantity_rejected INT DEFAULT 0,
  lot_number TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: via parent receiving_record
-- Index: receiving_record_id, po_line_id
```

### 1f. `replenishment_recommendations` (engine output)

```sql
CREATE TABLE IF NOT EXISTS public.replenishment_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  daily_usage_rate NUMERIC NOT NULL DEFAULT 0,
  usage_stddev NUMERIC DEFAULT 0,
  lead_time_days INT NOT NULL DEFAULT 7,
  safety_stock NUMERIC NOT NULL DEFAULT 0,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  target_stock NUMERIC NOT NULL DEFAULT 0,
  recommended_qty INT NOT NULL DEFAULT 0,
  current_on_hand NUMERIC DEFAULT 0,
  open_po_qty INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, approved, ordered, dismissed
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: org_member SELECT, org_member INSERT, org_admin UPDATE
-- Indexes: organization_id, product_id, status
```

### 1g. Alter `purchase_orders` for multi-line support

```sql
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS line_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receiving_status TEXT DEFAULT 'not_received'; -- not_received, partial, complete
-- Make product_id nullable (legacy single-product POs keep it; new multi-line POs use lines)
ALTER TABLE public.purchase_orders ALTER COLUMN product_id DROP NOT NULL;
```

---

## 2. Replenishment Engine

Pure calculation module at `src/lib/inventory/replenishment-engine.ts`:

```typescript
interface ReplenishmentInput {
  trailingUsage28d: number;       // total units used in 28 days
  usageValues: number[];          // daily usage array for stddev
  leadTimeDays: number;
  reviewPeriodDays: number;       // default 7 (weekly review)
  safetyFactor: number;           // default 1.65 (95% service level)
  minimumBuffer: number;          // default 2
  currentOnHand: number;
  openPoQty: number;
  moq: number;
  packSize: number;
}

interface ReplenishmentResult {
  dailyUsageRate: number;
  usageStddev: number;
  leadTimeDemand: number;
  safetyStock: number;
  reorderPoint: number;
  targetStock: number;
  recommendedQty: number;        // rounded up to MOQ/pack_size
  needsReorder: boolean;
}

// Formulas:
// daily_usage_rate = trailing_28_day_usage / 28
// lead_time_demand = daily_usage_rate × lead_time_days
// safety_stock = max(usage_stddev × safety_factor, minimum_buffer)
// reorder_point = lead_time_demand + safety_stock
// target_stock = lead_time_demand + review_period_demand + safety_stock
// recommended_qty = max(0, target_stock - current_on_hand - open_po_qty)
// → round up to nearest MOQ/pack_size multiple
```

---

## 3. PO Workflow (State Machine)

```text
draft → submitted → sent → partially_received → received → closed
                  ↘ cancelled
draft → cancelled
```

- **draft**: Lines being built, editable
- **submitted**: Internal approval (manager review)
- **sent**: Emailed to vendor
- **partially_received**: At least one receiving_record exists, not all lines fulfilled
- **received**: All lines fully received (quantity_received >= quantity_ordered)
- **closed**: Archived after reconciliation
- **cancelled**: Voided at any pre-received stage

---

## 4. Receiving Workflow

1. User opens a PO → sees all `purchase_order_lines` with ordered vs received quantities
2. "Receive Shipment" creates a `receiving_record` with status `partial` or `complete`
3. For each line, user enters `quantity_received`, `quantity_damaged`, `quantity_rejected`
4. System inserts `receiving_record_lines` → updates `purchase_order_lines.quantity_received` (cumulative)
5. For each accepted product: inserts `stock_movements` (reason: `receiving`, reference_type: `purchase_order`) and updates `products.quantity_on_hand`
6. If all lines fully received → PO status moves to `received`; otherwise `partially_received`
7. Updates vendor `avg_delivery_days` (existing running average logic)

---

## 5. Hooks

| Hook | Purpose |
|---|---|
| `useVendors()` | CRUD for vendor directory |
| `useVendorProducts(vendorId?)` | CRUD for vendor catalog entries |
| `usePreferredVendor(productId)` | Returns preferred vendor_product for a product |
| `usePurchaseOrderLines(poId)` | CRUD for PO lines |
| `useCreateMultiLinePO()` | Creates PO header + lines in one transaction |
| `useReceiveShipment()` | Creates receiving_record + lines, updates stock, updates PO status |
| `useReplenishmentRecommendations()` | Fetches pending recommendations |
| `useGenerateReplenishment()` | Runs replenishment engine for all/selected products, inserts recommendations |
| `useConvertRecommendationToPO()` | Groups recommendations by vendor → creates multi-line POs |

### Extended hooks
| Hook | Change |
|---|---|
| `useMarkPurchaseOrderReceived` | Delegate to `useReceiveShipment` for proper line-level receiving |
| `check-reorder-levels` edge function | Call replenishment engine instead of inline math |

---

## 6. Vendor Architecture

**Data model**: `vendors` is the master directory. `vendor_products` is the catalog linking vendors to products with vendor-specific pricing, SKUs, and MOQs. Each product can have multiple vendors; one is marked `is_preferred`.

**Migration path**: Existing `product_suppliers` data can be migrated into `vendors` + `vendor_products` via a one-time migration. The `product_suppliers` table stays for backward compatibility but new code uses `vendors`/`vendor_products`.

**Vendor selection for POs**: When generating a PO, the system selects the preferred vendor (`is_preferred = true`) or falls back to the vendor with the lowest unit_cost.

---

## 7. UI Surfaces

| Surface | Location |
|---|---|
| Vendor Directory | `/dashboard/settings/inventory/vendors` — list, add, edit vendors |
| Vendor Catalog | Vendor detail → products tab with SKUs, pricing |
| Multi-line PO Builder | PO detail page — add products, set quantities, review totals |
| Receiving Workspace | PO detail → "Receive" action — line-by-line quantity entry with damage/reject fields |
| Replenishment Dashboard | Inventory tab — pending recommendations with approve/dismiss/convert-to-PO actions |
| PO Status Timeline | PO detail — visual state progression with dates |

---

## 8. Implementation Order

1. Create `vendors`, `vendor_products`, `purchase_order_lines`, `receiving_records`, `receiving_record_lines`, `replenishment_recommendations` tables + alter `purchase_orders`
2. Build `replenishment-engine.ts` calculation module
3. Build `useVendors` + `useVendorProducts` hooks
4. Build `usePurchaseOrderLines` + `useCreateMultiLinePO` hooks
5. Build `useReceiveShipment` hook (line-level receiving + stock updates)
6. Build `useGenerateReplenishment` + `useConvertRecommendationToPO` hooks
7. Update `check-reorder-levels` edge function to use new engine
8. Build Vendor Directory UI
9. Build multi-line PO builder UI
10. Build Receiving Workspace UI
11. Build Replenishment Dashboard UI

