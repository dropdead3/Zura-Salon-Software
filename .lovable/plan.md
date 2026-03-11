

## Retail Breakdown Accordion

Replace the current Products sub-card + extension toggle with an expandable Retail accordion that shows total retail at the top and breaks down into three sub-categories on click.

### UI Design

```text
┌──────────────────────┐  ┌──────────────────────┐
│  ✂ Services          │  │  🛍 Retail        ▾   │
│   $4,708.00          │  │   $1,749.51          │
│      73%             │  │      27%             │
│                      │  │                      │
│                      │  │  ┌─ expanded ──────┐ │
│                      │  │  │ Products  $X.XX  │ │
│                      │  │  │ Merch     $X.XX  │ │
│                      │  │  │ Extensions $X.XX │ │
│                      │  │  └─────────────────┘ │
└──────────────────────┘  └──────────────────────┘
```

- Collapsed (default): Shows total Retail revenue + percentage, with a small chevron
- Expanded: Reveals 3 sub-rows — Products, Merch, Extensions — each with amount and mini bar proportional to retail total
- Clicking the card still opens the Products drilldown; the chevron toggles the accordion

### Categorization Logic

**`src/utils/serviceCategorization.ts`** — Add `isMerchProduct()`:
```
Pattern: /t.?shirt|tee|hat|cap|beanie|hoodie|sweatshirt|tote|bag|sticker|patch|pin|keychain|apparel|merch|branded/i
```

Three categories applied in order:
1. `isExtensionProduct(name)` → Extensions
2. `isMerchProduct(name)` → Merch
3. Everything else → Products (standard retail/haircare)

### Hook Changes

**Rename & expand `useExtensionProductRevenue.ts` → `useRetailBreakdown.ts`**

Same query (fetch all product-type transaction items), but classify each into 3 buckets:
```typescript
interface RetailBreakdownData {
  productRevenue: number;   // standard retail (haircare, etc)
  merchRevenue: number;     // apparel & branded goods
  extensionRevenue: number; // extension hardware
  productCount: number;
  merchCount: number;
  extensionCount: number;
}
```

Single query, single pass over items — more efficient than separate hooks.

### Component Changes

**`AggregateSalesCard.tsx`**:
- Replace `excludeExtensions` toggle + extension note with accordion state (`retailExpanded`)
- Retail sub-card shows total retail (all 3 categories combined) as the headline
- Chevron icon toggles expansion; card body click opens drilldown
- Expanded section: 3 compact rows with category icon, name, amount, and optional % of retail
- Remove the `Switch` import and extension toggle UI

**`ServiceProductDrilldown.tsx`**:
- Remove `excludeExtensions` prop (no longer needed — drilldown shows all product items)
- Optionally add category badges (Product/Merch/Extension) next to each item in the drilldown list

### Files Changed
1. `src/utils/serviceCategorization.ts` — add `isMerchProduct()` export
2. `src/hooks/useRetailBreakdown.ts` — new hook replacing `useExtensionProductRevenue`
3. `src/hooks/useExtensionProductRevenue.ts` — keep as re-export for any other consumers, or delete if unused elsewhere
4. `src/components/dashboard/AggregateSalesCard.tsx` — accordion UI replacing toggle
5. `src/components/dashboard/ServiceProductDrilldown.tsx` — remove `excludeExtensions` prop

