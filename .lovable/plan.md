

## Fourth-Pass Analysis — Service Price Recommendations Engine + Analytics Hub Integration

### Current State

The Price Intelligence engine is mature: transactional DB functions with auth guards, optimistic cache updates, dismissal persistence, revert capability, CSV export, sorting/filtering, mobile responsiveness, and audit history. The engine lives as a standalone page at `/admin/price-recommendations`.

**The key gap: Service Pricing analytics do not surface anywhere in the Analytics Hub.** The Analytics Hub has tabs for Sales, Operations, Marketing, Campaigns, Program, Reports, and Rent — but zero pricing intelligence. The Sales > Services subtab (`ServicesContent.tsx`) covers popularity, efficiency, and demand trends but has no margin or pricing data.

---

### Improvements to Implement

#### 1. Add "Pricing" Subtab to Analytics Hub > Sales Tab

**Problem:** Pricing intelligence is siloed in the Backroom Hub. Owners navigating the Analytics Hub — the primary analytics surface — have no visibility into margin health or pricing recommendations.

**Fix:** Add a new `pricing` subtab to `SalesTabContent.tsx` that renders a `PricingAnalyticsContent` component. This follows the existing subtab pattern (VisibilityGate + SubTabsTrigger + SubtabFavoriteStar).

**New file: `src/components/dashboard/analytics/PricingAnalyticsContent.tsx`**
Content:
- **KPI Strip** (4 cards): Services Below Target, Avg Margin Gap, Weighted Revenue Impact, Avg Product Cost per Service
- **Margin Distribution Chart**: Bar chart showing current margin % for each tracked service, with a target line overlay
- **Top At-Risk Services** card: Top 5 services with the largest margin gap, each linking to the Price Intelligence page
- **Margin Trend** (if historical snapshots exist): Line chart of average margin over time from `service_profitability_snapshots`
- **CTA card**: "Open Price Intelligence" button linking to the full page
- All cards use `MetricInfoTooltip`, `PinnableCard`, and `AnalyticsFilterBadge` per existing conventions

#### 2. Location Filter Support on Price Intelligence Page

**Problem:** The standalone page computes recommendations org-wide with no location scoping. Multi-location salons cannot see per-location pricing health.

**Fix:** Add a location selector to the page header (matching the Analytics Hub pattern). Pass `locationId` into the hook and filter `service_location_prices` and appointment volume accordingly. The recommendations computation already has the data — just needs a filter parameter.

#### 3. Date-Aware Profitability Summary Card

**Problem:** The page shows current-state pricing recommendations but no historical view of whether margins improved over time after accepting recommendations.

**Fix:** Add a "Margin Health Over Time" card at the bottom of the Price Intelligence page. Query `service_profitability_snapshots` grouped by week/month. Show a simple line chart of average contribution margin % trending over time. Reuse the existing `useServiceProfitabilitySnapshots` hook.

#### 4. MetricInfoTooltips Missing on KPI Strip

**Problem:** The 4 KPI cards on the Price Intelligence page have no tooltips, violating the analytics-info-tooltips rule.

**Fix:** Add `MetricInfoTooltip` to each KPI card with appropriate descriptions.

#### 5. Empty State Improvement — No Backroom App

**Problem:** If the Backroom app is not activated, the pricing subtab in Analytics Hub would show confusing empty data. There's no contextual guidance.

**Fix:** Check if the backroom app is active via `organization_apps`. If not, show an empty state with "Activate Zura Backroom to unlock service pricing intelligence."

---

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/dashboard/analytics/PricingAnalyticsContent.tsx` | New — pricing analytics subtab content |
| `src/components/dashboard/analytics/SalesTabContent.tsx` | Add "Pricing" subtab trigger + TabsContent |
| `src/pages/dashboard/admin/PriceRecommendations.tsx` | Add MetricInfoTooltips to KPIs, location filter, margin trend card |
| `src/hooks/backroom/useServicePriceRecommendations.ts` | Add optional `locationId` param to `useComputedPriceRecommendations` |

