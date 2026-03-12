

# Enhancements 4–9: Operational Efficiency and Intelligence Layer

Six features building on the existing inventory, analytics, and POS infrastructure.

---

## Enhancement 4: Supplier Scorecards (Expand Existing)

The existing `useSupplierPerformance` hook and `SupplierScorecard` component already compute fill rate, lead time accuracy, and grades. This enhancement adds **price consistency tracking** and **supplier risk badges on POs**.

**Database Migration:**
- Create `product_cost_history` table: `id`, `product_id`, `organization_id`, `supplier_name`, `cost_price`, `recorded_at`, with RLS via `is_org_member`.
- Add a trigger on `products` table that inserts into `product_cost_history` whenever `cost_price` changes.

**Hook Changes (`useSupplierPerformance.ts`):**
- Query `product_cost_history` grouped by supplier to compute price variance (coefficient of variation).
- Add `priceConsistency` (0–100%) and `priceChanges` count to `SupplierMetrics`.
- Factor price consistency into the grade formula (fill 50%, lead time 30%, price consistency 20%).

**UI Changes:**
- Update the Supplier Performance table in `RetailAnalyticsContent.tsx` to add a "Price Stability" column.
- Add a "Risk" badge (red/amber) to POs in the PO management view when the supplier grade is C or D.

---

## Enhancement 5: ABC Classification

Auto-classify products by cumulative revenue contribution.

**Hook: `src/hooks/useAbcClassification.ts` (new)**
- Takes the `ProductRow[]` from retail analytics (already has revenue per product).
- Sort by revenue descending, compute cumulative %. A = top 80% of revenue, B = next 15%, C = bottom 5%.
- Return a `Map<productName, 'A' | 'B' | 'C'>`.

**Analytics Card: `src/components/dashboard/analytics/AbcClassificationCard.tsx` (new)**
- Summary row: count and total value per class.
- Table with class badge, product name, revenue, cumulative %, stock, and suggested cycle-count frequency (A = weekly, B = monthly, C = quarterly).
- Pie chart showing revenue split by class.

**Wire into `RetailAnalyticsContent.tsx`.**

---

## Enhancement 6: Barcode Scan Stocktake (Upgrade Existing)

The existing `StocktakeDialog` already supports search-based stocktake. This enhancement adds a **mobile-optimized barcode scanning mode**.

**Component Changes (`StocktakeDialog.tsx`):**
- Add a "Scan Mode" toggle button at the top.
- In scan mode: auto-focus a large input field. When a barcode is entered (from a physical scanner or keyboard), auto-lookup via `useProductLookup` (already exists), add to the count list, and re-focus.
- Auto-advance: after a scan, show the product with a quantity input defaulting to 1. Staff can adjust and press Enter to confirm and scan the next item.
- Show a running tally of scanned items and total variance at the bottom.

**Mobile-Friendly Layout:**
- In scan mode, use a single-column layout with larger touch targets (h-12 inputs).
- Add haptic-style visual feedback (brief green flash) on successful scan.

No database changes needed — reuses existing `stock_counts` table.

---

## Enhancement 7: Margin Erosion Alerts

Track cost price changes over time and alert when margins compress below threshold.

**Database Migration:**
- Same `product_cost_history` table from Enhancement 4 (shared migration).

**Hook: `src/hooks/useMarginErosion.ts` (new)**
- Query `product_cost_history` for each product, compare latest cost to 90-day-ago cost.
- Calculate margin using `retail_price` and current `cost_price`.
- Flag products where: (a) cost increased >5% in 90 days, or (b) margin dropped below 30%.
- Return sorted list of eroded products with cost change %, current margin %, and estimated annual impact.

**Analytics Card: `src/components/dashboard/analytics/MarginErosionCard.tsx` (new)**
- Table: product, supplier, old cost → new cost, cost change %, current margin, severity badge.
- Summary metrics: total products affected, total annual margin at risk.
- PinnableCard wrapper.

**Wire into `RetailAnalyticsContent.tsx`.**

---

## Enhancement 8: Cross-Location Rebalancing Suggestions

Proactively suggest stock transfers when one location is overstocked and another is below par.

**Hook: `src/hooks/useRebalancingSuggestions.ts` (new)**
- Query all products with `location_id` set, grouped by product name + location.
- For each product across locations: if Location A has `quantity_on_hand > par_level * 1.5` and Location B has `quantity_on_hand < reorder_level`, suggest transferring the surplus.
- Calculate suggested transfer quantity: `min(surplus at A, deficit at B)`.
- Return list of suggestions with product, from/to location, quantities, and priority.

**Analytics Card: `src/components/dashboard/analytics/RebalancingCard.tsx` (new)**
- Table: product, from location (surplus), to location (deficit), suggested qty, one-click "Create Transfer" button.
- "Create Transfer" uses existing `useCreateStockTransfer` hook.
- Summary: total rebalancing opportunities, estimated value of stuck capital.
- PinnableCard wrapper.

**Wire into `RetailAnalyticsContent.tsx`.**

---

## Enhancement 9: Client-Product Affinity

Link POS purchase history to client profiles to surface "frequently purchased" products.

**Hook: `src/hooks/useClientProductAffinity.ts` (new)**
- Query `phorest_transaction_items` for a given `phorest_client_id`, filtering to product/retail item types.
- Group by `item_name`, count occurrences, compute recency (last purchase date).
- Return top 5 products sorted by frequency, with purchase count and last bought date.

**Component: `src/components/dashboard/clients/ClientAffinityBadges.tsx` (new)**
- Compact row of product badges showing the client's top purchased products.
- Each badge shows product name, purchase count, and "last bought X days ago" tooltip.

**Integration Points:**
- Wire into any client detail/profile view that has access to `phorest_client_id`.
- Wire into the checkout/appointment view if one exists, showing "This client usually buys:" prompt.

No database changes — queries existing `phorest_transaction_items` table.

---

## Implementation Order

1. **Enhancement 4 + 7 together** (shared `product_cost_history` migration)
2. Enhancement 5 (ABC Classification)
3. Enhancement 6 (Barcode Scan Stocktake)
4. Enhancement 8 (Rebalancing)
5. Enhancement 9 (Client Affinity)

---

## Database Migration (Shared for 4 & 7)

```sql
CREATE TABLE public.product_cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  supplier_name TEXT,
  cost_price NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_history_product ON public.product_cost_history(product_id, recorded_at DESC);
CREATE INDEX idx_cost_history_org ON public.product_cost_history(organization_id);

ALTER TABLE public.product_cost_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view cost history"
  ON public.product_cost_history FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert cost history"
  ON public.product_cost_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Trigger: log cost changes automatically
CREATE OR REPLACE FUNCTION public.log_cost_price_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.cost_price IS DISTINCT FROM NEW.cost_price AND NEW.cost_price IS NOT NULL THEN
    INSERT INTO public.product_cost_history (product_id, organization_id, cost_price)
    VALUES (NEW.id, NEW.organization_id, NEW.cost_price);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_cost_price_change
  AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_cost_price_change();
```

## Summary of New Artifacts

| # | Feature | New Files | Modified Files |
|---|---------|-----------|----------------|
| 4 | Supplier Scorecards | — | `useSupplierPerformance.ts`, `RetailAnalyticsContent.tsx` |
| 5 | ABC Classification | `useAbcClassification.ts`, `AbcClassificationCard.tsx` | `RetailAnalyticsContent.tsx` |
| 6 | Barcode Stocktake | — | `StocktakeDialog.tsx` |
| 7 | Margin Erosion | `useMarginErosion.ts`, `MarginErosionCard.tsx` | `RetailAnalyticsContent.tsx` |
| 8 | Rebalancing | `useRebalancingSuggestions.ts`, `RebalancingCard.tsx` | `RetailAnalyticsContent.tsx` |
| 9 | Client Affinity | `useClientProductAffinity.ts`, `ClientAffinityBadges.tsx` | Client detail views |
| DB | Shared migration | `product_cost_history` table + trigger | — |

