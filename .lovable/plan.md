

# Drop Dead × Zura — Vertical Integration Engine

## What It Builds

A closed-loop product intelligence and supply chain layer that connects Zura's service execution, backroom tracking, and inventory management to a preferred supplier pipeline (initially Drop Dead). Tracks product performance at the service level, recommends optimal products based on outcomes and margin, auto-triggers replenishment from preferred suppliers, and surfaces margin comparison between brands. Non-preferred products remain functional but lack automation and optimization.

## Architecture

```text
Service Booked (Scheduler)
     │
     ├── Formula Resolver (existing) → product requirements
     │
     ├── Product Recommendation Engine (NEW)
     │   ├── Service × Product Performance History
     │   ├── Brand Margin Analysis
     │   ├── Stylist Preference Patterns
     │   └── Preferred Supplier Priority
     │
     ├── Backroom Execution (existing)
     │   ├── Mix Session → usage tracking
     │   └── Inventory Ledger → stock decrements
     │
     ├── Auto-Replenishment Pipeline (NEW)
     │   ├── Booking velocity forecast (existing predictive service)
     │   ├── Threshold trigger → Draft PO
     │   └── Preferred supplier routing
     │
     └── Performance Feedback Loop (NEW)
         ├── Product × Service outcome tracking
         ├── Brand comparison analytics
         └── Product development insights (platform-level)
```

## Database Changes

**New table: `supplier_preferences`**
- `id`, `organization_id`, `supplier_name`, `is_preferred` (boolean, default false)
- `auto_replenish_enabled` (boolean, default false), `priority_rank` (integer, default 0)
- `fulfillment_api_url` (text, nullable — future), `notes` (text)
- `created_at`, `updated_at`
- RLS: org member read, org admin write

**New table: `product_service_performance`**
- `id`, `organization_id`, `product_id`, `service_name`, `location_id` (nullable)
- `total_uses` (integer), `avg_quantity_per_use` (numeric), `avg_service_revenue` (numeric), `avg_product_cost` (numeric)
- `margin_pct` (numeric), `outcome_score` (0–100, nullable — future)
- `last_used_at` (timestamptz), `period_start` (date), `period_end` (date)
- `created_at`
- RLS: org member read

**New table: `auto_replenishment_rules`**
- `id`, `organization_id`, `product_id` (nullable — null = org-wide default), `location_id` (nullable)
- `enabled` (boolean, default false), `supplier_preference_id` (FK nullable)
- `threshold_type` (enum: `days_of_stock`, `fixed_quantity`, `forecast_driven`)
- `threshold_value` (numeric), `max_order_value` (numeric, nullable)
- `require_approval` (boolean, default true)
- `created_at`, `updated_at`
- RLS: org member read, org admin write

**New table: `auto_replenishment_events`**
- `id`, `organization_id`, `product_id`, `location_id` (nullable)
- `trigger_reason` (text), `recommended_qty` (numeric), `supplier_name` (text)
- `status` (enum: `suggested`, `approved`, `ordered`, `dismissed`)
- `purchase_order_id` (FK nullable), `created_at`
- RLS: org member read, org admin write

## New Files

| File | Purpose |
|---|---|
| `src/config/vertical-integration/integration-config.ts` | Preferred supplier labels, threshold defaults, margin comparison thresholds |
| `src/lib/vertical-integration/product-recommendation-engine.ts` | Pure computation: rank products for a service by margin + usage frequency + preferred supplier status; brand margin comparison |
| `src/lib/vertical-integration/auto-replenishment-engine.ts` | Pure computation: evaluate replenishment triggers (combines existing replenishment-engine + booking velocity forecast), route to preferred supplier |
| `src/hooks/useVerticalIntegration.ts` | Queries supplier preferences, product service performance, auto-replenishment rules/events; composes recommendation and replenishment data |
| `src/hooks/useAutoReplenishment.ts` | CRUD for replenishment rules + events; trigger evaluation on demand |
| `src/components/dashboard/vertical-integration/SupplyChainDashboard.tsx` | Top-level dashboard: preferred supplier status, auto-replenishment queue, margin comparison, product performance |
| `src/components/dashboard/vertical-integration/BrandMarginComparison.tsx` | Side-by-side margin analysis: preferred vs non-preferred brands per service |
| `src/components/dashboard/vertical-integration/ReplenishmentQueue.tsx` | Pending auto-replenishment events with approve/dismiss actions |
| `src/components/dashboard/vertical-integration/ProductRecommendationCard.tsx` | Service-level product recommendation display |
| `supabase/functions/evaluate-replenishment/index.ts` | Edge function: scans inventory projections + booking velocity, generates auto-replenishment events for products below threshold |
| `supabase/functions/aggregate-product-performance/index.ts` | Edge function: aggregates mix session data into `product_service_performance` snapshots |

## Modified Files

| File | Change |
|---|---|
| `src/pages/dashboard/platform/ColorBarAdmin.tsx` | Add "Supply Chain" nav item under Operations group, rendering `SupplyChainDashboard` |

## Core Computation Model

### Product Recommendation Scoring

For a given service, rank available products by:
1. **Margin Score (40%)**: `(service_revenue - product_cost) / service_revenue` normalized to 0–100
2. **Usage Frequency (25%)**: Total uses relative to most-used product for that service
3. **Preferred Supplier Bonus (20%)**: +100 if product's supplier is marked preferred, else 0
4. **Consistency (15%)**: Inverse of quantity variance across uses

Output: Ranked product list per service with margin delta vs current selection.

### Auto-Replenishment Trigger

Reuses existing `calculateReplenishment()` from `replenishment-engine.ts`. Adds:
- **Forecast-driven mode**: Uses `predictive-color-bar-service.generateForecast()` to project demand from upcoming bookings
- **Preferred supplier routing**: When trigger fires, auto-replenishment event references the preferred supplier
- **Approval gate**: Events default to `suggested` status; require admin approval unless `require_approval = false`

### Brand Margin Comparison

Per service category, compute:
```
Preferred Brand Margin = avg(service_revenue - preferred_product_cost) / service_revenue
Alternative Brand Margin = avg(service_revenue - alt_product_cost) / service_revenue
Delta = Preferred - Alternative
```

### Performance Feedback (Platform-Level)

The `aggregate-product-performance` edge function:
1. Queries completed mix sessions + bowl lines for the trailing 30 days
2. Joins with service revenue from `service_profitability_snapshots`
3. Aggregates by product × service into `product_service_performance`
4. Platform admins can view cross-org anonymized aggregates (min 5 orgs cohort)

## Build Order

1. DB migration (4 new tables + enums + RLS)
2. `integration-config.ts`
3. `product-recommendation-engine.ts` (pure scoring)
4. `auto-replenishment-engine.ts` (trigger evaluation)
5. `evaluate-replenishment` edge function
6. `aggregate-product-performance` edge function
7. `useVerticalIntegration.ts` + `useAutoReplenishment.ts` hooks
8. UI: `BrandMarginComparison`, `ReplenishmentQueue`, `ProductRecommendationCard`, `SupplyChainDashboard`
9. Wire into ColorBarAdmin nav

## Technical Notes

- Product recommendations are deterministic — scoring formula uses margin + frequency + supplier status, no AI
- Auto-replenishment respects existing `require_po_approval` from `inventory_alert_settings` and adds its own `require_approval` per rule
- Non-preferred products remain fully functional in the backroom and mix sessions — they simply lack auto-replenishment and recommendation priority
- The system never forces product selection — it surfaces margin-optimal recommendations that stylists can accept or ignore
- Performance data flows one way: execution → analytics. No product data crosses organization boundaries except through platform-level anonymized aggregates (min 5 org cohort)
- Integrates with existing `purchasing-service.ts` for PO creation when replenishment events are approved

