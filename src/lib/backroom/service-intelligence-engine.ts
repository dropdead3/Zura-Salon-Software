/**
 * Service Intelligence Engine — Pure calculation functions.
 * No side effects, no DB access. All inputs are pre-fetched data.
 *
 * Computes operational profiles per service type and detects optimization opportunities.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface ServiceSessionData {
  serviceName: string;
  staffId: string;
  serviceRevenue: number;
  productCost: number;
  wasteCost: number;
  overageRevenue: number;
  durationMinutes: number;
  dispensedQty: number;
  wasteQty: number;
  reweighCompliant: boolean;
}

export interface ServiceProfile {
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

export interface StaffServiceUsage {
  staffId: string;
  serviceName: string;
  totalUsage: number;
  sessionCount: number;
}

export interface OptimizationInsight {
  service_name: string;
  type: 'high_variance' | 'high_waste' | 'low_margin' | 'rising_cost';
  severity: 'critical' | 'warning' | 'info';
  headline: string;
  detail: string;
  estimated_annual_savings: number | null;
  metrics: Record<string, number>;
}

export interface CostTrendPeriod {
  serviceName: string;
  periodIndex: number;
  avgCost: number;
}

// ── Calculations ───────────────────────────────────────────────────

/**
 * Aggregate session-level data into per-service profiles.
 */
export function calculateServiceProfiles(
  sessions: ServiceSessionData[],
  staffUsages: StaffServiceUsage[],
  defaultDurationMinutes: number = 60
): ServiceProfile[] {
  const groups = new Map<string, ServiceSessionData[]>();
  for (const s of sessions) {
    const arr = groups.get(s.serviceName) ?? [];
    arr.push(s);
    groups.set(s.serviceName, arr);
  }

  const profiles: ServiceProfile[] = [];

  for (const [name, items] of groups) {
    const count = items.length;
    if (count === 0) continue;

    const totalRevenue = items.reduce((s, i) => s + i.serviceRevenue, 0);
    const totalCost = items.reduce((s, i) => s + i.productCost, 0);
    const totalWasteCost = items.reduce((s, i) => s + i.wasteCost, 0);
    const totalDispensed = items.reduce((s, i) => s + i.dispensedQty, 0);
    const totalWaste = items.reduce((s, i) => s + i.wasteQty, 0);
    const totalDuration = items.reduce((s, i) => s + (i.durationMinutes || defaultDurationMinutes), 0);
    const reweighCount = items.filter((i) => i.reweighCompliant).length;

    const avgDuration = totalDuration / count;
    // BUG-17 fix: Use configurable labor rate instead of hardcoded $30/hr
    const effectiveLaborRate = laborRatePerHour ?? 30;
    const laborEstimate = (avgDuration / 60) * effectiveLaborRate * count;
    const margin = totalRevenue - totalCost - laborEstimate;
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

    // Staff variance for this service
    const serviceStaffUsages = staffUsages.filter((u) => u.serviceName === name);
    const { variancePct, topPerformerAvg } = calculateStaffVariance(serviceStaffUsages);

    profiles.push({
      service_name: name,
      session_count: count,
      avg_chemical_usage_g: round2(totalDispensed / count),
      avg_chemical_cost: round2(totalCost / count),
      avg_waste_rate_pct: totalDispensed > 0 ? round1((totalWaste / totalDispensed) * 100) : 0,
      avg_duration_minutes: round1(avgDuration),
      avg_revenue: round2(totalRevenue / count),
      contribution_margin: round2(margin / count),
      margin_pct: round1(marginPct),
      reweigh_compliance_pct: round1((reweighCount / count) * 100),
      staff_usage_variance_pct: round1(variancePct),
      top_performer_avg_usage_g: round2(topPerformerAvg),
    });
  }

  return profiles.sort((a, b) => b.session_count - a.session_count);
}

/**
 * Calculate coefficient of variation and top-performer average for staff usage on a service.
 */
function calculateStaffVariance(usages: StaffServiceUsage[]): {
  variancePct: number;
  topPerformerAvg: number;
} {
  if (usages.length <= 1) return { variancePct: 0, topPerformerAvg: usages[0]?.totalUsage / Math.max(usages[0]?.sessionCount ?? 1, 1) || 0 };

  const staffAvgs = usages.map((u) => u.totalUsage / Math.max(u.sessionCount, 1));
  const mean = staffAvgs.reduce((s, v) => s + v, 0) / staffAvgs.length;
  if (mean === 0) return { variancePct: 0, topPerformerAvg: 0 };

  const variance = staffAvgs.reduce((s, v) => s + (v - mean) ** 2, 0) / staffAvgs.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;

  // Top performer = lowest average usage (most efficient)
  const topPerformerAvg = Math.min(...staffAvgs);

  return { variancePct: cv, topPerformerAvg };
}

/**
 * Detect optimization opportunities from service profiles.
 */
export function detectOptimizations(
  profiles: ServiceProfile[],
  costTrends?: CostTrendPeriod[]
): OptimizationInsight[] {
  const insights: OptimizationInsight[] = [];

  for (const p of profiles) {
    // High variance: CV > 25%
    if (p.staff_usage_variance_pct > 25 && p.session_count >= 5) {
      const savingsPerService = (p.avg_chemical_usage_g - p.top_performer_avg_usage_g) * (p.avg_chemical_cost / Math.max(p.avg_chemical_usage_g, 1));
      const annualSavings = savingsPerService * p.session_count * 12; // rough annualization

      insights.push({
        service_name: p.service_name,
        type: 'high_variance',
        severity: p.staff_usage_variance_pct > 40 ? 'critical' : 'warning',
        headline: `High usage variance across stylists`,
        detail: `Average usage is ${p.avg_chemical_usage_g}g but top performers average ${p.top_performer_avg_usage_g}g. Standardizing could reduce chemical costs.`,
        estimated_annual_savings: round2(Math.max(annualSavings, 0)),
        metrics: {
          avg_usage: p.avg_chemical_usage_g,
          top_performer_usage: p.top_performer_avg_usage_g,
          variance_pct: p.staff_usage_variance_pct,
        },
      });
    }

    // High waste: > 15%
    if (p.avg_waste_rate_pct > 15 && p.session_count >= 3) {
      const wasteReductionTarget = p.avg_waste_rate_pct - 10; // target 10%
      const savingsPerService = p.avg_chemical_cost * (wasteReductionTarget / 100);
      const annualSavings = savingsPerService * p.session_count * 12;

      insights.push({
        service_name: p.service_name,
        type: 'high_waste',
        severity: p.avg_waste_rate_pct > 25 ? 'critical' : 'warning',
        headline: `Waste rate exceeds threshold`,
        detail: `${p.avg_waste_rate_pct}% of dispensed product is wasted, well above the 15% target. Review mixing protocols.`,
        estimated_annual_savings: round2(Math.max(annualSavings, 0)),
        metrics: {
          waste_rate_pct: p.avg_waste_rate_pct,
          avg_cost: p.avg_chemical_cost,
        },
      });
    }

    // Low margin: < 40%
    if (p.margin_pct < 40 && p.session_count >= 3) {
      insights.push({
        service_name: p.service_name,
        type: 'low_margin',
        severity: p.margin_pct < 25 ? 'critical' : 'warning',
        headline: `Contribution margin below target`,
        detail: `Margin is ${p.margin_pct}% against a 40% target. Consider pricing adjustment or cost reduction.`,
        estimated_annual_savings: null,
        metrics: {
          margin_pct: p.margin_pct,
          avg_revenue: p.avg_revenue,
          avg_cost: p.avg_chemical_cost,
          contribution_margin: p.contribution_margin,
        },
      });
    }

    // Rising cost trend: > 10% increase over 3 periods
    if (costTrends) {
      const serviceTrends = costTrends
        .filter((t) => t.serviceName === p.service_name)
        .sort((a, b) => a.periodIndex - b.periodIndex);

      if (serviceTrends.length >= 3) {
        const first = serviceTrends[0].avgCost;
        const last = serviceTrends[serviceTrends.length - 1].avgCost;
        if (first > 0) {
          const changePct = ((last - first) / first) * 100;
          if (changePct > 10) {
            insights.push({
              service_name: p.service_name,
              type: 'rising_cost',
              severity: changePct > 25 ? 'critical' : 'info',
              headline: `Chemical cost trending upward`,
              detail: `Cost per service has increased ${round1(changePct)}% over recent periods. Investigate supplier pricing or usage drift.`,
              estimated_annual_savings: null,
              metrics: {
                cost_change_pct: round1(changePct),
                first_period_cost: round2(first),
                latest_period_cost: round2(last),
              },
            });
          }
        }
      }
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Calculate estimated annual savings from standardizing usage to top-performer level.
 */
export function calculateAnnualSavings(
  avgUsage: number,
  topPerformerUsage: number,
  costPerUnit: number,
  annualVolume: number
): number {
  const savingsPerUnit = Math.max(avgUsage - topPerformerUsage, 0) * costPerUnit;
  return round2(savingsPerUnit * annualVolume);
}

// ── Helpers ────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
