

## Move Tips to a Standalone Card in the Right Sidebar

### What Changes

Remove the "Tips" sub-card from the secondary KPIs row (where it sits alongside Transactions, Avg Ticket, etc.) and create a new standalone Tips card in the right sidebar column -- below the Revenue Donut Chart. This separates tips from revenue visually, reinforcing that tips are not part of total revenue.

The new Tips card will display:
- **Total Tips** (hero number)
- **Average Tip Rate** (tips as % of revenue)
- Clickable to expand the existing Tips drilldown panel

### Layout Change

Current right sidebar (lines 1024-1041):
1. Top Performers Card
2. Revenue Donut Chart

Updated right sidebar:
1. Top Performers Card
2. Revenue Donut Chart
3. **Tips Summary Card** (new)

### Implementation Details

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

**1. Remove Tips sub-card from the 4-card KPI grid (lines 803-821)**

The 4-card grid (`grid-cols-2 sm:grid-cols-4`) currently has: Transactions, Avg Ticket, Rev/Hour, Tips. Remove the Tips card, making it a 3-card grid (`grid-cols-3 sm:grid-cols-3`).

**2. Remove Tips sub-card from the 5-card KPI grid (lines 899-917)**

The 5-card layout (when Daily Avg is shown) has a second row with Daily Avg and Tips in a `grid-cols-2`. Remove the Tips card from this row, leaving only Daily Avg as a single full-width card.

**3. Move the TipsDrilldownPanel render (lines 923-927)**

Move it from the main content column to inside the new Tips card in the sidebar, so the drilldown expands below the Tips card.

**4. Add new Tips Summary Card in the right sidebar (after line 1040)**

```text
+-------------------------------------+
|  TIPS                          (i)  |
|                                     |
|        $6,572                       |
|      Total Tips                     |
|                                     |
|   Avg Tip Rate: 12.1%              |
|                                     |
|     [Click for breakdown v]         |
+-------------------------------------+
|  (TipsDrilldownPanel expands here)  |
+-------------------------------------+
```

The card will:
- Use the same glass aesthetic as siblings (`bg-card/80 backdrop-blur-xl rounded-xl border`)
- Show a DollarSign icon in a `tokens.card.iconBox`
- Display `metrics?.totalTips` as the hero number using `AnimatedBlurredAmount`
- Calculate tip rate: `(totalTips / totalRevenue) * 100` -- both values available from `metrics`
- Show the tip rate using `formatPercent` or inline formatting
- Be clickable to toggle `tipsDrilldownOpen` (reusing existing state/handler)
- Include `MetricInfoTooltip` with the existing description
- Render `TipsDrilldownPanel` directly below it when expanded

### Technical Notes

- No new hooks or data fetching needed -- `metrics.totalTips` and `metrics.totalRevenue` are already available in scope
- The `tipsDrilldownOpen` state and `handleTipsToggle` handler remain unchanged
- The `TipsDrilldownPanel` component moves from the main column to the sidebar but its props stay the same
- KPI grid layouts simplify: 4-card becomes 3-card, 5-card second row becomes single card
