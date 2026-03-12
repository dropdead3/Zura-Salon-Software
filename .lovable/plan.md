

# Adaptive Service Intelligence — Implementation Plan

## Architecture

Read-only analytics layer that aggregates existing projection data per service type, computes operational profiles, detects optimization opportunities, and surfaces insights.

```text
service_profitability_snapshots + staff_backroom_performance
  + mix_sessions + mix_bowls + mix_bowl_lines + services
  → ServiceIntelligenceEngine (pure calculations)
  → Optimization detector
  → Insight cards + dashboard widgets
```

No new database tables. No mutations. Pure read-only computation from existing projections and operational tables.

## Implementation Layers

### 1. Calculation Engine: `src/lib/backroom/service-intelligence-engine.ts`

Pure functions (no DB access), following the `analytics-engine.ts` pattern:

- `calculateServiceProfile(sessions[])` → per-service avg usage, avg cost, avg waste, avg duration, margin
- `detectUsageVariance(staffProfiles[])` → identifies high-variance services across stylists
- `detectOptimizations(profiles[])` → returns optimization opportunities with estimated savings
- `calculateAnnualSavings(avgUsage, topPerformerUsage, costPerUnit, annualVolume)` → dollar savings estimate

**Optimization rules:**
- High variance: std deviation of staff usage > 25% of mean
- High waste: service waste rate > 15%
- Low margin: contribution margin % < 40%
- Rising cost: cost trend over 3 periods shows > 10% increase

### 2. Service Layer: `src/lib/backroom/services/service-intelligence-service.ts`

Orchestrates data fetching + calculation. Functions:

- `fetchServiceProfiles(orgId, startDate, endDate, locationId?)` — Queries `service_profitability_snapshots` + `staff_backroom_performance` + `services`, aggregates per service name
- `fetchStaffVarianceByService(orgId, startDate, endDate)` — Groups staff performance by service to detect cross-stylist variance
- `generateOptimizationInsights(orgId, startDate, endDate, locationId?)` — Runs optimization detection, returns ranked insight cards

Output type:
```typescript
interface ServiceProfile {
  service_name: string;
  session_count: number;
  avg_chemical_usage_g: number;
  avg_chemical_cost: number;
  avg_waste_rate_pct: number;
  avg_duration_minutes: number;
  avg_revenue: number;
  contribution_margin: number;
  margin_pct: number;
  reweigh_compliance_pct: number;
  staff_usage_variance_pct: number;
  top_performer_avg_usage_g: number;
}

interface OptimizationInsight {
  service_name: string;
  type: 'high_variance' | 'high_waste' | 'low_margin' | 'rising_cost';
  severity: 'critical' | 'warning' | 'info';
  headline: string;
  detail: string;
  estimated_annual_savings: number | null;
  metrics: Record<string, number>;
}
```

### 3. Hook: `src/hooks/backroom/useServiceIntelligence.ts`

- `useServiceProfiles(startDate, endDate, locationId?)` — Returns `ServiceProfile[]`
- `useOptimizationInsights(startDate, endDate, locationId?)` — Returns `OptimizationInsight[]`
- Both use `staleTime: 5 * 60_000`

### 4. UI Components: `src/components/dashboard/backroom/service-intelligence/`

**`ServiceProfileTable.tsx`** — Sortable table: Service, Sessions, Avg Usage, Avg Cost, Waste %, Duration, Revenue, Margin %. Uses design tokens + existing Table components.

**`OptimizationInsightCard.tsx`** — Insight cards with severity-based accent bars (matching AI insights panel pattern). Shows headline, detail, estimated savings, and underlying metrics.

**`ServiceIntelligenceSummary.tsx`** — Compact dashboard widget: service count, avg margin, optimization count, top saving opportunity. For owner dashboard embedding.

**`index.ts`** — Barrel exports.

## Build Order

1. Pure calculation engine (`service-intelligence-engine.ts`)
2. Service layer (`service-intelligence-service.ts`)
3. Hook (`useServiceIntelligence.ts`)
4. UI components (table, insight cards, summary)

## Edge Cases

- No completed sessions for a service → excluded from profiles
- Single stylist for a service → variance = 0, no high-variance insight
- No cost data on products → chemical cost shows as 0, margin reflects revenue - labor only
- Services without duration data → uses default 60 min estimate

## Performance

- All reads from indexed projection tables (`service_profitability_snapshots`, `staff_backroom_performance`)
- Contribution margin reuses existing `calculateContributionMargin()` from analytics-engine
- 5-minute stale time, no event stream queries

