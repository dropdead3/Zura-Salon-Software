

# Profit Per Appointment — Implementation Plan

## Existing Infrastructure

The codebase already has the core building blocks:
- `calculateContributionMargin()` in `analytics-engine.ts` (pure function)
- `service_profitability_snapshots` table with per-appointment rows (`appointment_id`, `service_revenue`, `product_cost`, `contribution_margin`, `waste_cost`, `staff_id`, `service_name`)
- `useContributionMargin` hook (aggregates by service category — not per-appointment)
- `useServiceProfitabilitySnapshots` hook (returns raw snapshots)
- `services` table with `price`, `cost` (labor), `duration_minutes`

What's missing: per-appointment profit display, labor cost breakdown, and dashboard analytics (avg profit by service type, trends, rankings).

## Architecture

No new database tables. Read from `service_profitability_snapshots` (already per-appointment) and enrich with labor estimates from `services.cost` and `services.duration_minutes`.

```text
service_profitability_snapshots (existing, per-appointment)
  + services (price, cost, duration_minutes)
  + appointments (client_name, appointment_date, staff_name)
  → AppointmentProfitEngine (pure calculations)
  → useAppointmentProfit hook
  → AppointmentProfitCard (inline) + ProfitDashboard (analytics)
```

## Implementation

### 1. Calculation Engine: `src/lib/backroom/appointment-profit-engine.ts`

Pure functions:

- `calculateAppointmentProfit(input)` — Takes revenue, chemical cost, labor estimate, waste cost; returns margin, margin %, and health status
- `estimateLaborCost(durationMinutes, hourlyRate, hasAssistant?, assistantMinutes?, assistantHourlyRate?)` — Computes total labor including assistant involvement
- `rankServicesByMargin(appointments[])` — Groups by service name, returns avg margin per type sorted
- `detectMarginOutliers(appointments[])` — Flags appointments significantly below average margin for their service type

Default hourly rate: org-configurable, fallback to `services.cost / (services.duration_minutes / 60)` if available, else a sensible default ($25/hr).

### 2. Hook: `src/hooks/backroom/useAppointmentProfit.ts`

- `useAppointmentProfit(startDate, endDate, locationId?)` — Queries `service_profitability_snapshots` joined with `services` (for duration/labor) and `appointments` (for client/date metadata). Returns enriched per-appointment profit rows.
- `useAppointmentProfitSummary(startDate, endDate, locationId?)` — Aggregates: avg profit per service type, highest/lowest margin services, profit trend over time (grouped by week/day).

Both use `staleTime: 5 * 60_000`, org-scoped, `enabled: !!orgId`.

### 3. UI Components: `src/components/dashboard/backroom/appointment-profit/`

**`AppointmentProfitCard.tsx`** — Inline card for individual appointment view. Shows:
- Service price
- Chemical cost (from snapshot)
- Labor estimate (from service duration × rate)
- Contribution margin with health indicator (green/amber/red)
- Waste generated

**`ProfitByServiceTable.tsx`** — Sortable table: Service Type, Appointments, Avg Revenue, Avg Chemical Cost, Avg Labor, Avg Margin, Avg Margin %. Highlights highest and lowest margin rows.

**`ProfitTrendChart.tsx`** — Recharts line/area chart showing profit trend over time (daily or weekly aggregation). Uses existing analytics card UI standards.

**`ProfitDashboardSummary.tsx`** — Summary widget with 4 metric cards: Total Appointments, Avg Margin %, Highest Margin Service, Lowest Margin Service. Follows compact analytics card pattern.

**`index.ts`** — Barrel exports.

### 4. Labor Cost Model

```
estimated_labor_cost = (duration_minutes / 60) × stylist_hourly_rate
```

If `assistant_assignments` exist for the appointment:
```
+ (assist_duration_minutes / 60) × assistant_hourly_rate
```

Hourly rates sourced from `services.cost` (already represents labor estimate per service). If not set, default to 0 (margin = revenue - chemical cost only, flagged as "labor not configured").

## Build Order

1. Pure calculation engine (`appointment-profit-engine.ts`)
2. Hook (`useAppointmentProfit.ts`)
3. UI components (card, table, chart, summary)

## Edge Cases

| Case | Handling |
|---|---|
| No mix session for appointment | Chemical cost = 0, margin = revenue - labor only, flagged "no mix data" |
| Missing cost data on products | Chemical cost underreported, margin shows asterisk |
| Incomplete/cancelled sessions | Excluded (snapshots only written for completed sessions) |
| No labor cost configured | Labor = 0, displayed with "labor not configured" note |
| Assistant involvement | Add assistant labor from `assistant_assignments.assist_duration_minutes` |

