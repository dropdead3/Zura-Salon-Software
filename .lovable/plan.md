

## Make Reorder Level Self-Explanatory

### Changes

**File:** `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`

1. **Table inventory cell** (~line 491): Change `Reorder: ${p.reorder_level}` → `Min. stock: ${p.reorder_level}` — immediately communicates it's a threshold, not a quantity to order.

2. **Table column header** (~line 397): Change "Inventory" tooltip or add a `MetricInfoTooltip` next to the header: *"Current stock on hand. When stock falls to or below the minimum stock level, the product is flagged as low stock."*

3. **Product form** (~line 802): Change the label from "Reorder Level" → "Min. Stock Level" and add a helper text beneath the input: `<p className="text-[11px] text-muted-foreground mt-1">Alert when stock falls to this number</p>`

4. **Low stock alert banner** (~line 1105): Change "below reorder level" → "at or below minimum stock level"

5. **Low stock table header** (~line 1118): "Reorder Level" → "Min. Stock"

All copy-only changes, no logic changes.

