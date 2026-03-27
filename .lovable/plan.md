

## Add MetricInfoTooltip to Color Bar KPI Tiles

### What Changes
Add info circle icons (top-right, per UI canon `tokens.kpi.infoIcon`) to each of the 6 KPI tiles with tooltip descriptions explaining what the metric is, how it's calculated, and how to use it.

### File: `src/components/dashboard/color-bar-settings/ColorBarDashboardOverview.tsx`

**1. Import `MetricInfoTooltip`** from `@/components/ui/MetricInfoTooltip`.

**2. Add `tooltip` prop to `KpiTile`** and render it absolutely positioned top-right:
```tsx
function KpiTile({ icon: Icon, label, value, status, subtitle, tooltip }: {
  // ...existing props
  tooltip?: string;
}) {
  return (
    <div className={cn(tokens.kpi.tile, 'relative')}>
      {tooltip && (
        <MetricInfoTooltip
          description={tooltip}
          className={tokens.kpi.infoIcon}  // absolute top-4 right-4
        />
      )}
      {/* ...existing content */}
    </div>
  );
}
```

**3. Add `tooltip` prop to `BudgetKpiTile`** with same absolute positioning.

**4. Add tooltip text to each KPI call site** (lines 149–188):

| KPI | Tooltip |
|-----|---------|
| Chemical Cost/Svc | "Average product cost per tracked service. Calculated from weighed product usage over the selected period. Use to benchmark cost efficiency and identify services consuming disproportionate product." |
| Waste Rate | "Percentage of product dispensed but not applied to a client service. Calculated as unused weight divided by total dispensed weight. A rate above 5% signals opportunities to improve dispensing accuracy." |
| Reweigh Rate | "Percentage of services where leftover product was weighed back after application. Higher compliance means more accurate waste and cost data. Below 80% indicates staff need reweigh reminders." |
| Stockout Alerts | "Number of products projected to run out before the next scheduled reorder. Based on current usage velocity and remaining stock levels. Address these to avoid service disruptions." |
| Budget | "Percentage of your monthly procurement budget spent so far this period. Tracks reorder spend against the budget you configured. Exceeding the alert threshold triggers a warning." |
| Supply Recovery | "Percentage of product costs recouped through client billing. Compares billed supply charges against actual product cost. Higher rates mean better cost pass-through to clients." |

### Result
Each KPI tile gets a subtle info icon in the top-right corner. Hovering reveals a clear explanation of the metric, its calculation, and actionable guidance — matching the platform's analytics tooltip standard.

