

# Add MetricInfoTooltip Explainers to Every KPI Row

## Problem

The criteria matrix lists 9+ KPI rows (Revenue, Retail %, Rebooking %, etc.) but none have contextual help explaining what the metric measures, how it's calculated, or what a reasonable target looks like. This makes configuration harder for operators unfamiliar with industry benchmarks.

## Solution

Add a `MetricInfoTooltip` next to each metric label in the left column of the criteria table. Each tooltip includes a description of what the metric measures and, where applicable, a suggested industry target range.

### Metric Tooltip Content

| Metric | Description | Suggested Target |
|--------|-------------|-----------------|
| Revenue | Total service revenue generated per evaluation period. | Varies by market — typical range $3K–$12K/week depending on level. |
| Retail % | Retail product sales as a percentage of total revenue. | Industry benchmark: 10–20%. |
| Rebooking % | Percentage of clients who rebook their next appointment before leaving. | Strong salons target 60–80%. |
| Avg Ticket | Average revenue per completed appointment. | Varies by service mix — track trend over time. |
| Client Retention | Percentage of clients who return within their expected rebooking window. | Healthy retention: 70–85%. |
| New Clients | Number of new clients seen per month. | 15–30/mo for growth-stage stylists; lower for senior books. |
| Utilization | Percentage of available hours that are booked with appointments. | Target: 75–90%. Below 70% signals underutilization. |
| Rev/Hr | Average revenue generated per booked hour of service. | Varies by price point — use to compare across team members. |
| Tenure | Minimum days at current level before promotion eligibility. | Typical: 90–180 days between levels. |
| Eval Window | Time period over which KPI performance is measured. | — |
| Approval | Whether promotion requires manual manager approval or is automatic. | — |
| Grace Period | Days a stylist has to recover performance before action is taken. | — |
| Action | What happens when a stylist falls below retention thresholds. | — |

### Implementation

1. **Create a constant map** `METRIC_TOOLTIPS: Record<string, string>` at the top of the `CriteriaComparisonTable` function (or near `METRIC_FIELD_MAP`) containing the description text for each metric label.

2. **Update `renderMetricRow`** (line ~628): Insert a `MetricInfoTooltip` after the `<span>{metric.label}</span>`, pulling the description from the map. Only render when not in editing mode (to avoid crowding the edit controls).

```tsx
<div className="flex items-center gap-1.5">
  <span>{metric.label}</span>
  {METRIC_TOOLTIPS[metric.label] && !isEditingRow && (
    <MetricInfoTooltip description={METRIC_TOOLTIPS[metric.label]} side="right" />
  )}
  {isEditingRow && ( /* existing edit controls */ )}
</div>
```

### Files Modified

- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — add tooltip map and render tooltips in metric label cells

### No database changes.

