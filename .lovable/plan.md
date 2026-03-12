

# Zura Backroom — Phase 2: Inventory Ledger Architecture

## Current State

Existing inventory infrastructure:
- `products` table with `quantity_on_hand` (mutable), `cost_price`, `reorder_level`, `par_level`, `location_id`
- `stock_movements` — append-only ledger with `quantity_change`, `quantity_after`, `reason` (free text), `product_id`
- `stock_counts` — per-product count with `counted_quantity`, `expected_quantity`, `variance`
- `stock_transfers` — approval flow with `from_location_id`, `to_location_id`, `quantity`, `status`
- `waste_events` — backroom waste with 5 categories
- `inventory_reorder_queue` — reorder suggestions
- `product_cost_history` — cost change audit trail via trigger
- `useLogStockMovement()` — mutation hook for stock_movements inserts

Key constraint: `stock_movements.reason` is free-text `string`, not an enum. This is actually flexible — we extend by convention, not schema change.

---

## 1. Schema Changes

### 1a. New table: `service_recipe_baselines`

Defines expected product usage per service type. Used for variance detection.

```sql
CREATE TABLE IF NOT EXISTS public.service_recipe_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expected_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'g',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, service_id, product_id)
);

ALTER TABLE public.service_recipe_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view baselines"
  ON public.service_recipe_baselines FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage baselines"
  ON public.service_recipe_baselines FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_service_recipe_baselines_updated_at
  BEFORE UPDATE ON public.service_recipe_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE INDEX IF NOT EXISTS idx_recipe_baselines_service
  ON public.service_recipe_baselines(service_id);
```

### 1b. New table: `count_sessions`

Groups individual `stock_counts` into a single counting event.

```sql
CREATE TABLE IF NOT EXISTS public.count_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
  started_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  total_products_counted INTEGER DEFAULT 0,
  total_variance_units NUMERIC DEFAULT 0,
  total_variance_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.count_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view count sessions"
  ON public.count_sessions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage count sessions"
  ON public.count_sessions FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
```

### 1c. Add `count_session_id` to existing `stock_counts`

```sql
ALTER TABLE public.stock_counts
  ADD COLUMN IF NOT EXISTS count_session_id UUID REFERENCES public.count_sessions(id) ON DELETE SET NULL;
```

### 1d. New table: `stock_transfer_lines`

Extends `stock_transfers` to support multi-product transfers.

```sql
CREATE TABLE IF NOT EXISTS public.stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'units',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transfer_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transfer line access via parent"
  ON public.stock_transfer_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stock_transfers t
    WHERE t.id = transfer_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Transfer line write via parent"
  ON public.stock_transfer_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.stock_transfers t
    WHERE t.id = transfer_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stock_transfers t
    WHERE t.id = transfer_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));
```

### 1e. Add `location_id` to `stock_movements` (if not present)

```sql
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS location_id TEXT,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,    -- 'mix_session', 'purchase_order', 'transfer', 'count', 'waste', 'manual'
  ADD COLUMN IF NOT EXISTS reference_id UUID;      -- FK to the source entity
```

No enum change needed — `reason` stays free text. We standardize reason codes by convention:

```text
Reason codes (convention):
  usage              — backroom mix session depletion
  receiving          — PO received
  transfer_out       — stock transfer outbound
  transfer_in        — stock transfer inbound
  count_adjustment   — physical count variance
  waste_adjustment   — waste event depletion
  expiration_discard — expired product removal
  manual_adjust      — manual correction
  sale               — retail sale
  return             — retail return
  po_received        — legacy (existing)
```

---

## 2. Ledger Architecture

### Append-only principle

`stock_movements` is the source of truth. `products.quantity_on_hand` is a **derived cache** that must always equal the latest `quantity_after` for that product.

```text
stock_movements (append-only)
  ├── reason: usage | receiving | transfer_out | transfer_in | count_adjustment | waste_adjustment | expiration_discard
  ├── reference_type + reference_id → links to source entity
  ├── quantity_change: signed (+/-)
  ├── quantity_after: running balance (computed at insert time)
  └── location_id: where the movement happened

products.quantity_on_hand = latest stock_movements.quantity_after for that product
```

### Inventory math

```text
available = on_hand - allocated

theoretical_remaining =
    previous_balance
  + receipts
  + transfers_in
  - usage
  - waste
  - transfers_out

shrinkage = theoretical_remaining - physical_count
```

### Movement logging flow

Session completion triggers a batch of `stock_movements`:

```text
MixSession completed
  → For each non-discarded bowl:
      → For each bowl_line:
          → INSERT stock_movement(
              product_id,
              quantity_change = -dispensed_quantity,
              reason = 'usage',
              reference_type = 'mix_session',
              reference_id = session.id,
              location_id = session.location_id
            )
          → UPDATE products SET quantity_on_hand = quantity_on_hand - dispensed_quantity

  → For each waste_event:
      → INSERT stock_movement(
              quantity_change = -quantity,
              reason = 'waste_adjustment',
              reference_type = 'waste_event',
              reference_id = waste_event.id
            )
```

---

## 3. Inventory APIs (Hooks)

### New hooks

| Hook | Purpose |
|---|---|
| `useDepleteMixSession(sessionId)` | On session completion: batch-insert stock_movements for all lines + waste, update products.quantity_on_hand |
| `useServiceRecipeBaselines(serviceId?)` | CRUD for recipe baselines |
| `useUsageVariance(sessionId)` | Compare actual bowl lines vs recipe baseline for the session's service |
| `useCountSessions()` | CRUD for count sessions with grouped stock_counts |
| `useStockTransferLines(transferId)` | CRUD for multi-product transfer lines |
| `useInventoryLedger(productId, filters?)` | Enhanced stock_movements query with reference_type filtering |
| `useTheoreticalBalance(productId, dateRange?)` | Compute theoretical remaining from ledger events |

### Extended hooks

| Hook | Change |
|---|---|
| `useLogStockMovement` | Add `reference_type`, `reference_id`, `location_id` params |
| `useCompleteStockTransfer` | Insert `stock_transfer_lines`-based movements instead of single-product |
| `useCreateStockCount` | Accept optional `count_session_id` |

---

## 4. Variance Logic

### Service Recipe Variance

```typescript
interface UsageVariance {
  product_id: string;
  product_name: string;
  expected_quantity: number;  // from service_recipe_baselines
  actual_quantity: number;    // from sum of bowl_lines for this product
  variance: number;           // actual - expected
  variance_pct: number;       // (variance / expected) * 100
  status: 'under' | 'over' | 'within_tolerance';
}
```

Tolerance threshold: configurable per org (default ±10%).

Calculation:
1. Look up `service_recipe_baselines` for the session's service
2. Aggregate `mix_bowl_lines` by `product_id` across all non-discarded bowls
3. Compare actual vs expected per product
4. Flag products not in baseline as "unplanned usage"
5. Flag baseline products with zero actual as "missing products"

### Shrinkage Variance (existing, enhanced)

Current `useShrinkageSummary` already computes `expected - counted`. Enhanced with:
- `theoretical_remaining` from ledger instead of static `expected_quantity`
- Time-bounded queries (count period)

---

## 5. Inventory UI Surfaces

### 5a. Session completion — usage summary (in BackroomTab)

After `handleCompleteSession`, show a summary panel:
- Products used with quantities and costs
- Variance vs recipe baseline (if baseline exists for this service)
- Waste events with categories
- Total session cost

### 5b. Product detail — ledger timeline (extends StockMovementHistory)

Enhance existing `StockMovementHistory` popover to:
- Show `reference_type` badges (mix session, PO, transfer, count, waste)
- Filter by reason code
- Link to source entity (e.g., click to open appointment)

### 5c. Inventory workspace — recipe baselines manager

New section in `/dashboard/settings/inventory/`:
- Table: service name | product count | last updated
- Drill-in: product list with expected quantities per service
- Bulk edit support

### 5d. Count session UI (extends existing stock counts)

- "Start Count" button creates a `count_session`
- Scan/search products → enter counted quantity
- Auto-calculates variance vs `quantity_on_hand`
- "Complete Count" finalizes and logs `count_adjustment` stock_movements

### 5e. Manager variance dashboard widget

New widget on `DashboardHome`:
- Top 5 products with highest usage variance (actual vs baseline)
- Sessions with unresolved flags
- Shrinkage trend chart

---

## 6. Entity Relationship (Phase 2 additions)

```text
services
  |
  +-- service_recipe_baselines (service_id, product_id, expected_quantity)
        |
        └── products

stock_transfers
  |
  +-- stock_transfer_lines (transfer_id, product_id, quantity)

count_sessions
  |
  +-- stock_counts (count_session_id FK)

stock_movements (extended)
  ├── location_id
  ├── reference_type
  └── reference_id → mix_sessions | purchase_orders | stock_transfers | count_sessions | waste_events
```

---

## 7. Implementation Order

1. **Extend `stock_movements`** — Add `location_id`, `reference_type`, `reference_id` columns
2. **Create `service_recipe_baselines`** — Table + RLS + hook
3. **Create `count_sessions`** — Table + RLS + extend `stock_counts` with FK
4. **Create `stock_transfer_lines`** — Table + RLS
5. **Build `useDepleteMixSession`** — Wire session completion to stock_movements + products.quantity_on_hand update
6. **Build `useUsageVariance`** — Compare actual vs baseline
7. **Enhance `StockMovementHistory`** — Show reference_type badges
8. **Build recipe baselines manager UI** — Settings page
9. **Build count session UI** — Grouped counting workflow
10. **Build variance dashboard widget** — DashboardHome integration

