

# Zura Supply AI Layer — Intelligence Dashboard

## Current State

Zura already has strong foundational pieces, but they're scattered across isolated modules:

| Capability | What Exists | What's Missing |
|---|---|---|
| **Reorder prediction** | `stockoutForecast.ts`, `replenishment-engine.ts`, `predictive-backroom-service.ts`, `check-reorder-levels` edge fn, `suggest-reorder-quantity` edge fn | No unified "Supply Intelligence" dashboard; stockout alerts are buried in Control Tower |
| **Waste tracking** | `WasteRecordDialog`, `service-intelligence-engine.ts` (detects high_waste, high_variance), waste rate in staff scorecard | No annualized waste cost rollup visible to owners |
| **Margin intelligence** | `appointment-profit-engine.ts`, `AppointmentProfitCard` (per-appointment), `OptimizationInsightCard` (low_margin, rising_cost) | No aggregate "profit optimization" view with actionable supply-mix recommendations |
| **Price intelligence** | `product_cost_history` table, `log_cost_price_change` trigger | No cross-salon benchmarking or supplier price comparison |
| **Usage intelligence** | `staff_usage_variance_pct` in service profiles, `top_performer_avg_usage_g` | Exists in Service Intelligence but not surfaced as a headline insight |
| **Proactive alerts** | `check-reorder-levels` creates POs + notifications, `ai-business-insights` generates cached AI insights | No "tap to reorder" from an alert card; no unified Supply AI feed |

## What to Build

### 1. Supply Intelligence Dashboard (New Page Section)

A new top-level tab or card group within Backroom Settings (or a dedicated `/dashboard/supply-intelligence` route) that consolidates all four intelligence pillars into a single owner-facing view.

**Layout**: 4 hero metric cards + a scrollable insight feed below.

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Annual Waste │ │  Reorder     │ │  Margin      │ │  Usage       │
│  $1,842/yr   │ │  6 products  │ │  Opportunity │ │  Variance    │
│  unused color │ │  at risk     │ │  +$22/service│ │  40% excess  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Supply Intelligence Feed                         [Refresh AI]  │
│                                                                 │
│ 🔴 INVENTORY: Projected to run out of 20vol developer in 6d    │
│    [Reorder Now →]                                              │
│                                                                 │
│ 🟡 WASTE: $1,842/yr in unused color tubes across 3 brands      │
│    Top offenders: Schwarzkopf Igora (32%), Wella Koleston (28%)│
│                                                                 │
│ 🟡 USAGE: Stylists mixing 40% more lightener than top performer│
│    Potential savings: $3,200/yr if standardized                 │
│                                                                 │
│ 🔵 MARGIN: Balayage profit could increase $22/service          │
│    by switching to [brand] developer at same quality level      │
└─────────────────────────────────────────────────────────────────┘
```

**Data sources** (all already in DB):
- **Waste**: Aggregate from `service-intelligence-engine` profiles (`avg_waste_rate_pct` * `avg_chemical_cost` * annual volume)
- **Reorder**: From `predictive-backroom-service` forecasts (products with `stockout_risk` high/critical)
- **Margin**: From `appointment-profit-engine` + optimization insights (`low_margin`, `rising_cost` types)
- **Usage**: From service profiles (`staff_usage_variance_pct`, `top_performer_avg_usage_g` vs `avg_chemical_usage_g`)

### 2. Supply AI Edge Function (`supply-intelligence`)

A new edge function that aggregates backroom data and generates the four intelligence categories via Lovable AI. Unlike the existing `ai-business-insights` (which covers revenue, staffing, capacity), this is specifically tuned for supply chain intelligence.

**Inputs gathered server-side**:
- `service_profiles` data (waste rates, margins, usage variance)
- `inventory_risk_projections` (stockout forecasts)
- `product_cost_history` (price trends)
- `stock_movements` aggregated waste events
- `products` with `cost_price` and `quantity_on_hand`

**AI prompt** asks for structured tool-call output across the 4 categories with `estimated_annual_impact` for each insight.

**Caching**: Same pattern as `ai-business-insights` — store in `ai_business_insights` table with a `location_id` prefix like `supply:all` or `supply:<locationId>`.

### 3. "Tap to Reorder" from Insight Cards

When a stockout alert appears, add a one-tap action button that:
1. Checks if a draft PO already exists for that product
2. If not, creates one via `usePurchaseOrders.createDraftPO`
3. Shows confirmation toast with PO link

This connects the existing `suggest-reorder-quantity` AI function to an actionable UI flow.

### 4. Price Intelligence Foundation (DB + Display)

- Add `product_cost_history` aggregation query to show cost trend per product over time
- Display in the Supply Intelligence feed when a product's cost has risen significantly vs. historical average
- Future: cross-org benchmarking (requires anonymized aggregate data — flag as roadmap)

## Implementation Plan

| Step | What | Files |
|---|---|---|
| 1 | Create `supply-intelligence` edge function | `supabase/functions/supply-intelligence/index.ts` |
| 2 | Create `useSupplyIntelligence` hook | `src/hooks/backroom/useSupplyIntelligence.ts` |
| 3 | Create `SupplyIntelligenceDashboard` component | `src/components/dashboard/backroom/supply-intelligence/SupplyIntelligenceDashboard.tsx` |
| 4 | Create `SupplyInsightCard` component | `src/components/dashboard/backroom/supply-intelligence/SupplyInsightCard.tsx` |
| 5 | Create `SupplyKPICards` component | `src/components/dashboard/backroom/supply-intelligence/SupplyKPICards.tsx` |
| 6 | Create `QuickReorderButton` component | `src/components/dashboard/backroom/supply-intelligence/QuickReorderButton.tsx` |
| 7 | Wire into Backroom Settings as a new tab/section | `src/components/dashboard/backroom-settings/` |
| 8 | Update `supabase/config.toml` for new edge function | `supabase/config.toml` |

## Key Technical Decisions

- **No new DB tables needed** — reuses `ai_business_insights` for caching with a `supply:` location prefix, and reads from existing tables
- **AI model**: `google/gemini-3-flash-preview` (fast, structured output via tool calling)
- **Price benchmarking**: Displayed as cost trend over time from `product_cost_history` — cross-salon comparison is flagged as future/roadmap since it requires anonymized multi-tenant aggregation
- **Reorder action**: Leverages existing `usePurchaseOrders` hook for PO creation, no new mutations needed

