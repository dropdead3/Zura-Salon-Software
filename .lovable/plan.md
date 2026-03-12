

# Inventory Ledger Architecture — Redesign Plan

## Current State Analysis

The codebase currently uses a **dual-write anti-pattern**:

1. **`products.quantity_on_hand`** — a mutable integer field treated as the source of truth for stock levels
2. **`stock_movements`** — an append-only log that records changes, but is secondary to the mutable field

**Direct mutations found in 3 locations:**
- `useDepleteMixSession.ts` — updates `products.quantity_on_hand` after mix session
- `useReceiveShipment.ts` — updates `products.quantity_on_hand` after PO receiving
- `usePurchaseOrders.ts` — updates `products.quantity_on_hand` after quick-receive

These are race-condition-prone because they read the current quantity, compute a new value, and write it back — without transactions. Two concurrent mix sessions can overwrite each other.

Additionally, there is no `product_variants` table — products are flat. The plan references `product_variant_id`, but the current schema uses `product_id`. We will use `product_id` for now and add variant support as a future extension.

---

## Architecture

### Layer 1: Inventory Ledger (Source of Truth)

Rename/extend existing `stock_movements` table to serve as the canonical ledger. No new table needed — the existing table already has the right shape. We add the missing fields.

```sql
-- Extend stock_movements to full ledger spec
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'units';

-- Backfill event_type from existing reason column
UPDATE public.stock_movements SET event_type = reason WHERE event_type IS NULL;

-- Add NOT NULL constraint after backfill
ALTER TABLE public.stock_movements ALTER COLUMN event_type SET NOT NULL;
```

**Existing fields already present:** `id`, `organization_id`, `product_id`, `quantity_change`, `reason`, `notes`, `reference_type` (= source_entity_type), `reference_id` (= source_entity_id), `location_id`, `created_by`, `created_at`.

**`event_type` values:** `usage`, `receiving`, `transfer_out`, `transfer_in`, `count_adjustment`, `waste_adjustment`, `expiration_discard`, `manual_correction`.

**Immutability enforcement:** Add an UPDATE/DELETE policy that blocks all modifications:

```sql
CREATE POLICY "Ledger entries are immutable"
  ON public.stock_movements FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Ledger entries cannot be deleted"
  ON public.stock_movements FOR DELETE TO authenticated
  USING (false);
```

### Layer 2: Inventory Projection (Derived Balance)

New table for fast queries. Replaces `products.quantity_on_hand` as the read path.

```sql
CREATE TABLE public.inventory_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id TEXT,
  on_hand NUMERIC NOT NULL DEFAULT 0,
  allocated NUMERIC NOT NULL DEFAULT 0,
  on_order NUMERIC NOT NULL DEFAULT 0,
  available NUMERIC GENERATED ALWAYS AS (on_hand - allocated) STORED,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_id, location_id)
);
```

### Layer 3: Projection Rebuild Function

A database function that recalculates a projection from the ledger:

```sql
CREATE OR REPLACE FUNCTION public.rebuild_inventory_projection(
  p_org_id UUID, p_product_id UUID, p_location_id TEXT DEFAULT NULL
) RETURNS void AS $$
  INSERT INTO inventory_projections (organization_id, product_id, location_id, on_hand, last_calculated_at)
  SELECT p_org_id, p_product_id, p_location_id,
    COALESCE(SUM(quantity_change), 0),
    now()
  FROM stock_movements
  WHERE organization_id = p_org_id
    AND product_id = p_product_id
    AND (p_location_id IS NULL OR location_id = p_location_id)
  ON CONFLICT (organization_id, product_id, location_id)
  DO UPDATE SET
    on_hand = EXCLUDED.on_hand,
    last_calculated_at = now();
$$ LANGUAGE sql SECURITY DEFINER;
```

### Layer 4: Trigger-Based Projection Update

A trigger on `stock_movements` INSERT that incrementally updates the projection:

```sql
CREATE OR REPLACE FUNCTION public.update_projection_on_ledger_insert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO inventory_projections (organization_id, product_id, location_id, on_hand)
  VALUES (NEW.organization_id, NEW.product_id, NEW.location_id, NEW.quantity_change)
  ON CONFLICT (organization_id, product_id, location_id)
  DO UPDATE SET
    on_hand = inventory_projections.on_hand + NEW.quantity_change,
    last_calculated_at = now();

  -- Sync to products.quantity_on_hand for backward compatibility
  UPDATE products SET quantity_on_hand = (
    SELECT COALESCE(SUM(on_hand), 0) FROM inventory_projections
    WHERE product_id = NEW.product_id AND organization_id = NEW.organization_id
  ) WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_projection_on_ledger_insert
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_projection_on_ledger_insert();
```

This trigger eliminates all client-side `products.quantity_on_hand` updates — the database handles it atomically.

---

## Event Flow

```text
Source System          Ledger (stock_movements)        Projection
─────────────         ────────────────────────         ──────────
Mix Session     →     INSERT event_type='usage'    →   trigger updates on_hand
PO Receiving    →     INSERT event_type='receiving' →  trigger updates on_hand
Transfer        →     INSERT transfer_out + in     →   trigger updates on_hand
Cycle Count     →     INSERT count_adjustment      →   trigger updates on_hand
Waste Event     →     INSERT waste_adjustment      →   trigger updates on_hand
Expiration      →     INSERT expiration_discard    →   trigger updates on_hand
Manager Adjust  →     INSERT manual_correction     →   trigger updates on_hand
```

---

## Inventory Math

```text
available = on_hand - allocated

theoretical_remaining =
  previous_balance
  + receipts + transfers_in
  - usage - waste - transfers_out

ghost_loss = theoretical_remaining - physical_count
```

Ghost loss is computed by comparing a `count_adjustment` event's implied balance against the theoretical balance from all other events in the period.

---

## Ledger Entry Rules by Subsystem

| Source | event_type | quantity_change | reference_type | reference_id |
|---|---|---|---|---|
| Mix session completion | `usage` | negative | `mix_session` | session ID |
| PO line received | `receiving` | positive | `purchase_order` | PO ID |
| Transfer out | `transfer_out` | negative | `stock_transfer` | transfer ID |
| Transfer in | `transfer_in` | positive | `stock_transfer` | transfer ID |
| Cycle count | `count_adjustment` | delta | `stock_count` | count ID |
| Waste event | `waste_adjustment` | negative | `waste_event` | waste event ID |
| Expiration discard | `expiration_discard` | negative | `waste_event` | waste event ID |
| Manager manual | `manual_correction` | +/- | `manual` | null |

---

## Code Refactoring Required

**Remove direct `products.quantity_on_hand` mutations from:**
1. `useDepleteMixSession.ts` — remove lines 96-102 (product update loop)
2. `useReceiveShipment.ts` — remove lines 83-95 (product qty update)
3. `usePurchaseOrders.ts` — remove lines 166-169 (product qty update)
4. `useCompleteStockTransfer()` in `useStockTransfers.ts` — remove product query + movement quantity_after calculation

The trigger handles all projection updates. Client code only needs to INSERT into `stock_movements`.

**Remove `quantity_after` field requirement** — currently every movement stores a snapshot. With the trigger, this becomes redundant but can be kept for audit purposes (populated by the trigger).

**Update read paths:**
- `useInventoryDaysRemaining` — query `inventory_projections` instead of `products.quantity_on_hand`
- Product list/detail views — join or query `inventory_projections` for on_hand display
- `products.quantity_on_hand` remains synced via trigger for backward compatibility during migration

---

## Concurrency Strategy

- **Append-only ledger** — no read-modify-write on stock_movements; concurrent INSERTs never conflict
- **Trigger-based projection** — `ON CONFLICT DO UPDATE SET on_hand = on_hand + NEW.quantity_change` is atomic at the row level in Postgres
- **No client-side quantity calculation** — eliminates race conditions entirely

---

## Audit Visibility

Every `stock_movements` row contains: `created_by` (who), `created_at` (when), `reference_type` + `reference_id` (what caused it), `event_type` (what happened), `notes` (context). The existing `useInventoryLedger` hook already queries this table with filtering by reference_type and reason.

---

## Example Ledger Entries

**Mix session usage (45g lightener):**
```json
{ "event_type": "usage", "product_id": "abc", "quantity_change": -45,
  "reference_type": "mix_session", "reference_id": "sess-1",
  "location_id": "loc-1", "notes": "Backroom mix session depletion" }
```

**Receiving inventory (24 units via PO):**
```json
{ "event_type": "receiving", "product_id": "abc", "quantity_change": 24,
  "reference_type": "purchase_order", "reference_id": "po-1",
  "notes": "Received via PO po-1" }
```

**Transfer between locations:**
```json
[
  { "event_type": "transfer_out", "product_id": "abc", "quantity_change": -10,
    "location_id": "loc-1", "reference_type": "stock_transfer", "reference_id": "xfer-1" },
  { "event_type": "transfer_in", "product_id": "abc", "quantity_change": 10,
    "location_id": "loc-2", "reference_type": "stock_transfer", "reference_id": "xfer-1" }
]
```

**Count adjustment (found 5 fewer than expected):**
```json
{ "event_type": "count_adjustment", "product_id": "abc", "quantity_change": -5,
  "reference_type": "stock_count", "reference_id": "count-1",
  "notes": "Physical count: 95, Expected: 100" }
```

---

## Implementation Order

1. Migration: extend `stock_movements`, create `inventory_projections`, create trigger + rebuild function, add immutability policies
2. Backfill: populate `inventory_projections` from existing `stock_movements` data
3. Refactor: remove direct `products.quantity_on_hand` mutations from 4 hooks
4. Update read paths to use `inventory_projections` where location-specific data needed
5. Verify backward compatibility via trigger sync to `products.quantity_on_hand`

