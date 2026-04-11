/**
 * Zura Capital — Configuration
 *
 * Deterministic thresholds, status enums, and type constants
 * for the capital execution layer. No AI involvement.
 */

/* ── Zura Eligibility Thresholds ── */
export const ZURA_ELIGIBILITY_THRESHOLDS = {
  /** Minimum ROE multiplier to surface a funding opportunity */
  minROE: 1.8,
  /** Minimum confidence score (0–100) */
  minConfidence: 70,
  /** Maximum risk level allowed */
  maxRisk: 'medium' as const,
  /** Max concurrent funded projects per organization */
  maxConcurrentFundedProjects: 3,
  /** Max capital exposure per location ($) */
  maxExposurePerLocation: 200_000,
  /** Max capital exposure per stylist ($) */
  maxExposurePerStylist: 50_000,
  /** Cooldown after declined offer (days) */
  cooldownAfterDeclineDays: 30,
  /** Cooldown after underperforming funded project (days) */
  cooldownAfterUnderperformingDays: 60,
  /** Variance threshold that marks a funded project as underperforming (%) */
  underperformanceVarianceThreshold: -25,
  /** Days after which an un-surfaced opportunity is stale */
  maxStaleDays: 90,
  /** Minimum capital required to be worth surfacing ($) */
  minCapitalRequired: 5_000,
} as const;

/* ── Risk Level Ordering ── */
const RISK_RANK: Record<string, number> = {
  low: 1,
  moderate: 2,
  medium: 2,
  high: 3,
  very_high: 4,
};

export function isRiskWithinTolerance(riskLevel: string, maxRisk: string): boolean {
  return (RISK_RANK[riskLevel] ?? 99) <= (RISK_RANK[maxRisk] ?? 0);
}

/* ── Funding Opportunity Status ── */
export const FUNDING_OPPORTUNITY_STATUSES = [
  'detected',
  'eligible_internal',
  'eligible_provider',
  'surfaced',
  'viewed',
  'initiated',
  'pending_provider',
  'funded',
  'declined',
  'expired',
  'canceled',
  'completed',
  'underperforming',
] as const;

export type FundingOpportunityStatus = typeof FUNDING_OPPORTUNITY_STATUSES[number];

export const FUNDING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  detected: { label: 'Detected', color: 'text-muted-foreground' },
  eligible_internal: { label: 'Eligible', color: 'text-primary' },
  eligible_provider: { label: 'Funding Available', color: 'text-primary' },
  surfaced: { label: 'Surfaced', color: 'text-primary' },
  viewed: { label: 'Reviewed', color: 'text-primary' },
  initiated: { label: 'Initiated', color: 'text-amber-600' },
  pending_provider: { label: 'Pending', color: 'text-amber-600' },
  funded: { label: 'Funded', color: 'text-green-600' },
  declined: { label: 'Declined', color: 'text-muted-foreground' },
  expired: { label: 'Expired', color: 'text-muted-foreground' },
  canceled: { label: 'Canceled', color: 'text-muted-foreground' },
  completed: { label: 'Completed', color: 'text-green-600' },
  underperforming: { label: 'Underperforming', color: 'text-destructive' },
};

/* ── Funding Performance Status ── */
export const FUNDING_PERFORMANCE_STATUSES = [
  'not_started',
  'active',
  'on_track',
  'above_forecast',
  'below_forecast',
  'at_risk',
  'repaid',
  'closed',
] as const;

export type FundingPerformanceStatus = typeof FUNDING_PERFORMANCE_STATUSES[number];

export const PERFORMANCE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'text-muted-foreground' },
  active: { label: 'Active', color: 'text-primary' },
  on_track: { label: 'On Track', color: 'text-green-600' },
  above_forecast: { label: 'Above Forecast', color: 'text-green-600' },
  below_forecast: { label: 'Below Forecast', color: 'text-amber-600' },
  at_risk: { label: 'At Risk', color: 'text-destructive' },
  repaid: { label: 'Repaid', color: 'text-green-600' },
  closed: { label: 'Closed', color: 'text-muted-foreground' },
};

/* ── Opportunity Types ── */
export const OPPORTUNITY_TYPES = [
  'capacity_expansion',
  'inventory_expansion',
  'service_growth',
  'location_expansion',
  'new_location_launch',
  'stylist_capacity_growth',
  'campaign_acceleration',
  'equipment_expansion',
  'marketing_acceleration',
] as const;

export type OpportunityType = typeof OPPORTUNITY_TYPES[number];

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  capacity_expansion: 'Capacity Expansion',
  inventory_expansion: 'Inventory Expansion',
  service_growth: 'Service Growth',
  location_expansion: 'Location Expansion',
  new_location_launch: 'New Location Launch',
  stylist_capacity_growth: 'Stylist Growth',
  campaign_acceleration: 'Campaign Acceleration',
  equipment_expansion: 'Equipment Expansion',
  marketing_acceleration: 'Marketing Acceleration',
};

/* ── Constraint Types ── */
export const CONSTRAINT_TYPES = [
  'capacity_bottleneck',
  'inventory_bottleneck',
  'strong_demand',
  'market_opportunity',
  'stylist_ready_to_scale',
  'page_or_campaign_growth_gap',
  'service_waitlist_pressure',
  'understocking_risk',
] as const;

export type ConstraintType = typeof CONSTRAINT_TYPES[number];

export const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  capacity_bottleneck: 'Capacity Bottleneck',
  inventory_bottleneck: 'Inventory Bottleneck',
  strong_demand: 'Strong Demand',
  market_opportunity: 'Market Opportunity',
  stylist_ready_to_scale: 'Stylist Ready to Scale',
  page_or_campaign_growth_gap: 'Growth Gap',
  service_waitlist_pressure: 'Waitlist Pressure',
  understocking_risk: 'Understocking Risk',
};

/* ── Surfacing Limits ── */
export const SURFACING_LIMITS = {
  /** Max opportunities to show in a contextual card */
  perLocalView: 2,
  /** Max top opportunities in owner-level views */
  perOwnerView: 3,
} as const;

/* ── Capital Event Types ── */
export const CAPITAL_EVENT_TYPES = [
  'surfaced',
  'viewed',
  'clicked',
  'initiated',
  'funded',
  'declined',
  'completed',
] as const;

export type CapitalEventType = typeof CAPITAL_EVENT_TYPES[number];

/* ── Surface Areas ── */
export const SURFACE_AREAS = [
  'command_center',
  'ops_hub',
  'service_dashboard',
  'stylist_dashboard',
  'capital_queue',
  'expansion_planner',
] as const;

export type SurfaceArea = typeof SURFACE_AREAS[number];
