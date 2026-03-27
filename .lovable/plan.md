

## Add MetricInfoTooltip to Command Center Cards

### What Changes
Add `MetricInfoTooltip` inline with each card title across the 4 Command Center cards: Control Tower, Procurement, Staff Performance, and Inventory Health.

### File: `src/components/dashboard/color-bar-settings/ColorBarDashboardOverview.tsx`

Per the UI canon, the tooltip goes inside the title's flex row, immediately after `CardTitle`. Each card header's `<div>` wrapping the title/description needs a `flex items-center gap-2` wrapper around just the title + tooltip.

**4 card headers updated (lines ~206, ~245, ~314, ~359):**

| Card | Tooltip |
|------|---------|
| Control Tower | "Real-time operational alerts for your color bar — cost spikes, stockouts, compliance gaps, and audit flags. Alerts are ranked by severity so you can address the highest-impact issues first." |
| Procurement | "Tracks month-to-date procurement spend against your configured budget target. Includes next-month projections based on current usage velocity and flags when spend is trending over budget." |
| Staff Performance | "Ranks stylists by waste rate over the last 30 days. Identifies top performers and those needing coaching. Use to target training on dispensing accuracy and reweigh compliance." |
| Inventory Health | "Snapshot of stock risk levels across tracked products. Products are classified as Critical, High Risk, or Medium based on projected days-of-supply remaining versus reorder lead times." |

**Pattern per card header** (same for all 4):
```tsx
<div>
  <div className="flex items-center gap-2">
    <CardTitle className={tokens.card.title}>Control Tower</CardTitle>
    <MetricInfoTooltip description="..." />
  </div>
  <CardDescription>...</CardDescription>
</div>
```

`MetricInfoTooltip` is already imported in this file from the previous KPI tile work — no new imports needed.

### Result
Each of the 4 Command Center cards gets a subtle info icon next to its title, matching the KPI tiles above. Hovering reveals what the card shows, how data is sourced, and how to act on it.

