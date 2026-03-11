

## Enhance Revenue Breakdown Card with Retail Sub-Categories

### What's changing
The Revenue Breakdown card currently shows Services vs Retail as a flat split. Extensions are lumped into "Retail" but they're really a service input (needed for extension services), inflating the true retail attach rate. We'll break Retail into sub-categories and show a "True Retail" metric that excludes extensions.

### Changes — `src/components/dashboard/sales/RevenueDonutChart.tsx`

**1. Accept retail breakdown data as new optional props**
- Add optional props: `extensionRevenue`, `productOnlyRevenue`, `merchRevenue`, `giftCardRevenue` (from the existing `useRetailBreakdown` hook)
- When provided, the legend expands Retail into sub-rows

**2. Update the donut chart segments**
- Keep the two-segment donut (Services vs Total Retail) for simplicity at the top level
- Below the Services/Retail legend rows, add indented sub-rows for the retail breakdown:
  - Products (standard retail) — main retail dot color
  - Extensions — slightly different muted tone
  - Merch — if non-zero
  - Gift Cards — if non-zero

**3. Add "True Retail %" metric**
- Below the existing "Retail %" row, add a "True Retail %" row
- Calculated as `(totalRetail - extensionRevenue) / totalRevenue × 100`
- Tooltip: "Retail revenue excluding extensions (which are service inputs), as a percentage of total revenue. A more accurate measure of cross-selling."

**4. Update "Attach Rate" tooltip**
- Clarify that the attach rate counts all product purchases (including extensions) vs a "true" attach rate if we can distinguish — or leave as-is since it comes from a different data source

### Changes — Parent components (3 files)

**`AggregateSalesCard.tsx` (~line 1403):** Pass retail breakdown data. The `useRetailBreakdown` hook is likely already called nearby or can be added. Pass `extensionRevenue`, `productOnlyRevenue` etc. to `RevenueDonutChart`.

**`CommandCenterAnalytics.tsx` and `PinnedAnalyticsCard.tsx`:** Same pattern — pass breakdown data if available, otherwise the card gracefully falls back to the current two-row display.

### Layout (reference the screenshot)

```text
● Services                    92%
● Retail                       8%
    Products                   5%
    Extensions                 3%
────────────────────────────
Retail %              ⓘ       8%
True Retail %         ⓘ       5%
Attach Rate           ⓘ      11%
```

Sub-rows are indented with no dot (or a smaller dot) and slightly smaller text to maintain hierarchy. "True Retail %" is the key new insight.

