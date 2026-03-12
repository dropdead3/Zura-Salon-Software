

## Product Movement Rating Badges

### Concept

Add a dynamic **movement rating** badge to every product, computed from sales velocity data. The tiers:

| Rating | Criteria (units/day over analysis period) | Badge Color |
|--------|------------------------------------------|-------------|
| **Best Seller** | Top 10% by velocity AND velocity > 0.5/day | Emerald/green glow |
| **Popular** | Top 25% by velocity AND velocity > 0.2/day | Blue |
| **Steady** | Velocity > 0.05/day (sold regularly) | Default/muted |
| **Slow Mover** | Velocity > 0 but <= 0.05/day | Amber/warning |
| **Stagnant** | 0 velocity but has sold in last 180 days | Orange |
| **Dead Weight** | 0 velocity, no sales in 180+ days (or never sold) | Red/destructive |

Products with zero stock are excluded from negative ratings (can't sell what you don't have).

### Data Source

The `salesVelocity` map already exists in `useRetailAnalytics` — it maps product name (lowercase) to units/day. For the inventory settings tab, we'll compute a lightweight 90-day velocity via a new shared utility rather than pulling the full analytics hook.

### Implementation

**1. New utility: `src/lib/productMovementRating.ts`**

A pure function that takes a product name, velocity (units/day), total units sold, and days-since-last-sale, then returns the rating tier + badge config (label, color variant, tooltip text). This keeps the logic DRY between settings and analytics.

**2. New hook: `src/hooks/useProductVelocity.ts`**

A lightweight hook that queries the last 90 days of POS transaction items (same table `useRetailAnalytics` uses) but only returns a `Map<string, { velocity: number; lastSoldDate: string | null }>`. Used in the inventory settings tab where the full analytics hook would be overkill.

**3. Inventory Settings Tab (`RetailProductsSettingsContent.tsx`)**

- Add a "Movement" column after the Product column in the table header
- Render a compact movement badge per product row using the velocity data
- Badge includes a tooltip with velocity detail (e.g., "0.3 units/day — 27 sold in 90 days")
- Add a "Movement" filter dropdown to filter by rating tier

**4. Retail Analytics Hub (`RetailAnalyticsContent.tsx`)**

- Add movement badges to the Product Performance table (next to existing "Best Seller" badge)
- New **Movement Distribution** card showing:
  - Pie/donut chart: count of products per tier
  - Revenue breakdown by tier (what % of revenue comes from each movement tier)
  - Actionable callouts: "X products rated Dead Weight tying up $Y in capital"
- Add movement badge to the Brand Performance drilldown product rows

**5. Public shop `ProductCard.tsx`**

- Show "Best Seller" and "Popular" badges on the public shop cards (positive signals only — no negative ratings shown to customers)

**6. Product Detail Modal**

- Show the movement badge with full context (velocity, trend)

### File Summary

| File | Action |
|------|--------|
| `src/lib/productMovementRating.ts` | New — pure rating logic + badge config |
| `src/hooks/useProductVelocity.ts` | New — lightweight 90-day velocity query |
| `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` | Add Movement column + filter |
| `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` | Add badges to product table + new Movement Distribution card |
| `src/components/shop/ProductCard.tsx` | Show Best Seller / Popular badges |
| `src/components/shop/ProductDetailModal.tsx` | Show movement badge |

