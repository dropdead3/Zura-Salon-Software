

# Supply Intelligence Enhancements — Plan

## 1. Product Cost Trend Sparklines

Add inline sparklines to `SupplyInsightCard` for price-category insights, and create a dedicated `ProductCostTrendCard` for the Supply Intelligence dashboard showing top products with rising costs.

**New hook** — `useProductCostTrend.ts`:
- Query `product_cost_history` grouped by product, ordered by `recorded_at`
- Return per-product cost arrays suitable for `TrendSparkline` (already exists)
- Accept optional `productIds` filter

**UI changes**:
- In `SupplyInsightCard`: when `category === 'price'` and `product_id` is present, render a `TrendSparkline` next to the impact column using cost history data
- New `ProductCostTrendSection` component below the KPI cards in `SupplyIntelligenceDashboard`: a compact list of top 5-8 products with rising costs, each showing name, current cost, % change, and a sparkline. Reuses `TrendSparkline` and the existing `useMarginErosion` data (already fetches cost history + computes % change)

**Files**:
- Create: `src/hooks/backroom/useProductCostTrend.ts`
- Create: `src/components/dashboard/backroom/supply-intelligence/ProductCostTrendSection.tsx`
- Modify: `SupplyInsightCard.tsx` — add sparkline for price insights
- Modify: `SupplyIntelligenceDashboard.tsx` — wire in the trend section

## 2. Weekly Supply Intelligence Email Digest

A scheduled edge function that generates the Supply Intelligence summary and emails it to org admins using the existing `sendOrgEmail` infrastructure.

**New edge function** — `supply-intelligence-digest/index.ts`:
- Iterates active organizations
- For each org, calls the `supply-intelligence` function logic (or reads cached `ai_business_insights` where `location_id LIKE 'supply:%'`)
- Formats a plain HTML email with the 4 KPIs + top 5 insights (severity-sorted)
- Sends via `sendOrgEmail` to all org admins (query `organization_admins` for emails)
- Rate: weekly via pg_cron (Sunday evening)

**Cron job** (via SQL insert, not migration):
```sql
SELECT cron.schedule('supply-digest-weekly', '0 18 * * 0',
  $$ SELECT net.http_post(...) $$);
```

**Files**:
- Create: `supabase/functions/supply-intelligence-digest/index.ts`
- Config: add `[functions.supply-intelligence-digest]` to `supabase/config.toml`

## 3. Cross-Org Price Benchmarking (Roadmap Only)

No implementation — add a UI placeholder and documentation.

- Add a "Price Benchmarking" section to `SupplyIntelligenceDashboard` with a "Coming Soon" badge and brief description: "Compare your supply costs against anonymized industry data"
- This requires an anonymized aggregate layer (a separate service that collects opt-in cost data across orgs) — flag as a future milestone

**Files**:
- Modify: `SupplyIntelligenceDashboard.tsx` — add roadmap card at bottom

## Summary

| Item | Effort | New Files | Modified Files |
|------|--------|-----------|----------------|
| Cost trend sparklines | Medium | 2 | 2 |
| Weekly digest email | Medium | 1 | 1 (config.toml) |
| Benchmarking roadmap placeholder | Trivial | 0 | 1 |

