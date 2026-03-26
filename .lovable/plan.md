

## Service Price Recommendations Engine

### Concept

When product costs change or a salon switches product lines, their service prices may no longer hit margin targets. This feature calculates **recommended service prices** based on actual product costs from recipe baselines, then lets owners accept recommendations with one click — propagating the change to base price, all stylist level prices, location prices, website, and booking wizard.

### Data Layer

**New table: `service_price_targets`**
- `id`, `organization_id`, `service_id` (unique per service), `target_margin_pct` (e.g. 60 = 60%), `created_at`, `updated_at`
- RLS: org member read/write via `is_org_member`

**New table: `service_price_recommendations`** (log of generated recommendations)
- `id`, `organization_id`, `service_id`, `current_price`, `recommended_price`, `product_cost`, `margin_pct_current`, `margin_pct_target`, `status` (pending/accepted/dismissed), `accepted_at`, `created_at`
- RLS: org member read/write

### Calculation Engine

**New file: `src/lib/backroom/price-recommendation.ts`**

For each tracked chemical service:
1. Sum product cost from `service_recipe_baselines`: `Σ(expected_quantity × cost_per_gram)`
2. Apply target margin: `recommended_price = product_cost / (1 - target_margin_pct / 100)`
3. Compare to current `services.price` → compute delta and current margin
4. Flag if current margin < target margin by more than 2% (configurable threshold)

### Hook

**New file: `src/hooks/backroom/useServicePriceRecommendations.ts`**

- `useServicePriceTargets(orgId)` — fetch/upsert per-service target margins
- `useComputedPriceRecommendations(orgId)` — client-side calculation joining baselines, products, current prices, and targets
- `useAcceptPriceRecommendation()` — mutation that:
  1. Updates `services.price` to the recommended price
  2. Calculates the ratio (`new_price / old_price`) and scales all `service_level_prices` proportionally
  3. Scales all `service_location_prices` proportionally
  4. Logs acceptance in `service_price_recommendations`
  5. Invalidates all pricing query keys (website, booking, level prices)

### UI — Inline Alerts (Service Tracking)

In `ServiceTrackingSection.tsx`, for each service row that has a pending recommendation:
- Show an amber badge: "Price below target margin"
- In the drill-down, add a compact recommendation card:
  - Current price → Recommended price (with delta)
  - Product cost | Current margin | Target margin
  - "Accept" button (primary) and "Dismiss" (ghost)

### UI — Dedicated Price Intelligence Page

**New page: `src/pages/dashboard/admin/PriceRecommendations.tsx`**

A table of all tracked services with columns:
- Service name | Category | Product Cost | Current Price | Current Margin % | Target Margin % (editable inline) | Recommended Price | Delta | Action (Accept / Dismiss)

Header KPIs:
- Services below target | Average margin gap | Total revenue impact if all accepted

Batch actions: "Accept All" for bulk application.

### Route & Navigation

- Route: `/dashboard/admin/price-recommendations`
- Nav entry in `dashboardNav.ts` under admin section with appropriate permission
- Deep-link from Service Tracking inline alerts to the full page

### Downstream Propagation

When a recommendation is accepted, the mutation updates:
1. `services.price` — base price (used by website and booking wizard)
2. `service_level_prices` — all level rows scaled by the same ratio
3. `service_location_prices` — all location rows scaled by the same ratio

Since the website (`useNativeServicesForWebsite`) and booking wizard already read from these tables, no additional wiring is needed — query invalidation ensures fresh data.

### Files

| Layer | Files |
|-------|-------|
| Migration | New tables: `service_price_targets`, `service_price_recommendations` with RLS |
| Engine | `src/lib/backroom/price-recommendation.ts` |
| Hooks | `src/hooks/backroom/useServicePriceRecommendations.ts` |
| Inline UI | `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (add recommendation card in drill-down) |
| Page | `src/pages/dashboard/admin/PriceRecommendations.tsx` |
| Components | `src/components/dashboard/backroom-settings/PriceRecommendationCard.tsx`, `PriceRecommendationsTable.tsx` |
| Route + Nav | `App.tsx`, `src/config/dashboardNav.ts` |

