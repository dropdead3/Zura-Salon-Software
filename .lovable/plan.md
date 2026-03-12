

## Redesign Product Table Row Layout

### Problem
The current table has 12 columns crammed into each row, making it visually congested — especially with long product names, multi-line SKUs, and small text competing for attention.

### Design Approach
Consolidate columns by grouping related info, creating a more spacious two-line row layout:

```text
Current (12 columns):
[☐] [Avatar Name] [Brand] [Category] [Type] [SKU] [Retail] [Cost] [Stock] [Reorder] [Online] [Actions]

Proposed (8 columns):
[☐] [Avatar + Name      ] [Brand     ] [Category] [Pricing      ] [Inventory    ] [Online] [Actions]
     SKU · Type badge       (unchanged)             $28 retail      12 in stock     toggle   dup/edit
                                                    $14 cost         ⚠ reorder: 4
```

### Specific Changes

**File:** `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`

1. **Product column (merge Name + SKU + Type)**
   - Line 1: Avatar + product name (font-medium)
   - Line 2: SKU in mono text + Type badge inline, muted — e.g. `OLA-CO-002 · Extensions`
   - Gives the product identity one scannable block

2. **Brand column** — unchanged

3. **Category column** — unchanged

4. **Pricing column (merge Retail + Cost)**
   - Line 1: Retail price (foreground, tabular-nums)
   - Line 2: Cost price (muted, smaller)
   - Single right-aligned column header "Price"

5. **Inventory column (merge Stock + Reorder)**
   - Line 1: Stock count (clickable inline edit as today) with low-stock warning
   - Line 2: "Reorder: X" in muted text
   - Single right-aligned column header "Inventory"

6. **Online column** — unchanged (switch toggle)

7. **Actions column** — unchanged (duplicate + edit icons)

8. **Remove standalone SKU, Retail, Cost, Stock, Reorder columns** from the header

9. **Sort headers**: Keep sorting on Product (name), Brand, Category, Price (retail_price), Inventory (quantity_on_hand). Remove cost_price and product_type from sortable headers since they're now nested.

10. **Row height**: Rows naturally get taller with the two-line layout — no explicit height change needed, just ensure `py-3` on cells for breathing room.

### Result
- 12 columns → 8 columns
- Each row is taller but far more readable
- Key info (name, SKU, type) grouped together
- Financial info (retail, cost) stacked
- Inventory info (stock, reorder) stacked
- No information removed — just reorganized

### Files Changed
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` (table header + row template)

