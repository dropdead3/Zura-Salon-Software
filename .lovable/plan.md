

# Add MetricInfoTooltip Explainers to Economics Tab

## What's Missing

Three card titles and most table column headers lack tooltip explainers. The Business Assumptions fields and the Level Margin Analysis / Service × Level Matrix / Stylist Snapshots card titles already have them.

## Changes

### File: `src/components/dashboard/settings/CommissionEconomicsTab.tsx`

**1. Margin by Level card title** (line ~370) — add tooltip after `MARGIN BY LEVEL`:
> "Shows each level's commission rate, breakeven revenue, and actual margin based on trailing 90-day average revenue per stylist. Breakeven is the revenue where costs equal income; Target Rev adds your desired profit margin on top."

**2. Margin by Level table column headers** (lines ~394–402) — add tooltips to each column head:
- **Service %** — "Commission percentage paid on service revenue at this level."
- **Retail %** — "Commission percentage paid on retail product sales at this level."
- **Hourly Wage** — "Base hourly pay for this level, if enabled. This fixed cost is factored into breakeven and margin calculations."
- **Breakeven Rev** — "Monthly revenue per stylist needed to cover all costs (commission + product + overhead + wage) with zero profit."
- **Target Rev** — "Monthly revenue per stylist needed to cover all costs and achieve your target margin percentage."
- **Actual Avg Rev** — "Average monthly service revenue per stylist at this level, calculated from trailing 90-day appointment data."
- **Margin** — "Actual profit margin at this level's current revenue. Calculated as: (Revenue − Commission − Product Cost − Overhead − Wage) ÷ Revenue."
- **Status** — "On Target means margin meets your goal. Tight means positive but below target. Negative means costs exceed revenue."

**3. What-If Simulator card title** (line ~612) — add tooltip after `WHAT-IF SIMULATOR`:
> "Drag commission sliders to model how rate changes affect target revenue and margin. Changes here are hypothetical and do not save. Use 'Optimize with Zura' to get AI-recommended rates."

**4. Zura Recommendations card title** (line ~516) — add tooltip after `ZURA RECOMMENDATIONS`:
> "AI-generated commission rate suggestions based on your cost structure, current revenue, and industry benchmarks. Apply to the What-If simulator to preview impact before making changes."

### File: `src/components/dashboard/settings/LevelEconomicsSection.tsx`

**5. Level Summary Card inline metrics** — add small tooltips next to key labels inside each level card:
- **"weighted margin"** label (line ~197) — tooltip: "Average margin across all services this level performs, weighted by how often each service is booked."
- **"Revenue / stylist"** (line ~210) — tooltip: "Average monthly service revenue per stylist at this level from trailing 90-day data."
- **"Services below target"** (line ~224) — tooltip: "Number of services where the margin at this level falls below your target margin percentage."

**6. Stylist Snapshots table column headers** (lines ~355–361) — add tooltips:
- **Appointments** — "Total appointments for this stylist in the 90-day analysis window."
- **Revenue** — "Total service revenue for this stylist in the analysis window."
- **Margin** — "Weighted average margin across all services this stylist performed, accounting for their actual service mix."
- **Hourly Contribution** — "Effective margin earned per hour worked. Calculated as: (total margin dollars) ÷ (estimated hours worked). Higher is better."
- **Status** — "Healthy means margin meets target. Tight means positive but below target. Underpriced means costs exceed revenue for this stylist's mix."

**7. Silent Margin Erosion alert** (line ~142) — add tooltip next to the heading:
> "Detected when a level uses the base service price (no level-specific override) but has a higher commission rate than base. The salon pays more commission without charging more — margin shrinks silently."

## Total: ~20 new tooltips across 2 files. No logic changes, no database changes.

