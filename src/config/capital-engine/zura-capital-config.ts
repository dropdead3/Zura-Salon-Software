/**
 * Zura Capital — Production Configuration
 *
 * Deterministic thresholds, state machines, surface controls,
 * priority weights, and type constants for the capital execution layer.
 */

/* ── Zura Eligibility Thresholds ── */
export const ZURA_ELIGIBILITY_THRESHOLDS = {
  minROE: 1.8,
  minConfidence: 70,
  maxRisk: 'medium' as const,
  maxConcurrentFundedProjects: 2,
  maxExposurePerLocation: 200_000,
  maxExposurePerStylist: 50_000,
  cooldownAfterDeclineDays: 14,
  cooldownAfterUnderperformingDays: 30,
  underperformanceVarianceThreshold: -25,
  maxStaleDays: 90,
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

/* ── Funding Opportunity Status (State Machine) ── */
export const FUNDING_OPPORTUNITY_STATUSES = [
  'draft',
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
  draft: { label: 'Draft', color: 'text-muted-foreground' },
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

/** Allowed state transitions for funding opportunities */
export const FUNDING_OPPORTUNITY_TRANSITIONS: Record<string, string[]> = {
  draft: ['detected'],
  detected: ['eligible_internal', 'expired', 'canceled'],
  eligible_internal: ['eligible_provider', 'expired', 'canceled', 'draft'],
  eligible_provider: ['surfaced', 'expired', 'canceled'],
  surfaced: ['viewed', 'initiated', 'expired'],
  viewed: ['initiated', 'expired'],
  initiated: ['pending_provider'],
  pending_provider: ['funded', 'declined', 'canceled'],
  funded: ['completed', 'underperforming'],
  underperforming: ['completed', 'canceled'],
  expired: [],
  declined: [],
  canceled: [],
  completed: [],
};

/* ── Funding Project Status (State Machine) ── */
export const FUNDING_PROJECT_STATUSES = [
  'active',
  'on_track',
  'above_forecast',
  'below_forecast',
  'at_risk',
  'repaid',
  'closed',
] as const;

export type FundingProjectStatus = typeof FUNDING_PROJECT_STATUSES[number];

export const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-primary' },
  on_track: { label: 'On Track', color: 'text-green-600' },
  above_forecast: { label: 'Above Forecast', color: 'text-green-600' },
  below_forecast: { label: 'Below Forecast', color: 'text-amber-600' },
  at_risk: { label: 'At Risk', color: 'text-destructive' },
  repaid: { label: 'Repaid', color: 'text-green-600' },
  closed: { label: 'Closed', color: 'text-muted-foreground' },
};

/* ── Repayment Status ── */
export const REPAYMENT_STATUSES = [
  'not_started',
  'active',
  'behind',
  'completed',
  'delinquent',
  'unknown',
] as const;

export type RepaymentStatus = typeof REPAYMENT_STATUSES[number];

export const REPAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'text-muted-foreground' },
  active: { label: 'Active', color: 'text-primary' },
  behind: { label: 'Behind', color: 'text-amber-600' },
  completed: { label: 'Completed', color: 'text-green-600' },
  delinquent: { label: 'Delinquent', color: 'text-destructive' },
  unknown: { label: 'Unknown', color: 'text-muted-foreground' },
};

/* ── Activation Status ── */
export const ACTIVATION_STATUSES = [
  'pending',
  'launched',
  'partially_launched',
  'blocked',
  'completed',
] as const;

export type ActivationStatus = typeof ACTIVATION_STATUSES[number];

export const ACTIVATION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-muted-foreground' },
  launched: { label: 'Launched', color: 'text-green-600' },
  partially_launched: { label: 'Partial', color: 'text-amber-600' },
  blocked: { label: 'Blocked', color: 'text-destructive' },
  completed: { label: 'Completed', color: 'text-green-600' },
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

/* ── Capital Event Types (Full Production Set) ── */
export const CAPITAL_EVENT_TYPES = [
  'opportunity_detected',
  'opportunity_updated',
  'internal_eligibility_passed',
  'internal_eligibility_failed',
  'provider_check_requested',
  'provider_offer_received',
  'provider_ineligible',
  'opportunity_surfaced',
  'opportunity_viewed',
  'funding_initiated',
  'provider_redirect_started',
  'provider_redirect_completed',
  'funding_approved',
  'funding_declined',
  'project_activated',
  'project_activation_failed',
  'repayment_synced',
  'performance_synced',
  'status_changed',
  'opportunity_dismissed',
  'opportunity_expired',
  // Legacy compat
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

/* ── Surface Cooldown Defaults (days) — re-exported from canonical ── */
export { CANONICAL_SURFACE_COOLDOWNS as SURFACE_COOLDOWN_DEFAULTS } from './capital-formulas-config';

/* ── Surface Priority Weights ── */
// CANONICAL weights are in capital-formulas-config.ts (CANONICAL_SURFACE_PRIORITY_WEIGHTS).
// This legacy export is kept for backward compatibility with surface-priority-engine.ts.
// New consumers should import from capital-formulas-config.ts.
export { CANONICAL_SURFACE_PRIORITY_WEIGHTS as SURFACE_PRIORITY_WEIGHTS } from './capital-formulas-config';

/* ── Surface Type Filters ── */
export const SURFACE_TYPE_FILTERS: Record<SurfaceArea, OpportunityType[] | null> = {
  command_center: null, // top opportunity across all types
  ops_hub: ['capacity_expansion', 'inventory_expansion', 'equipment_expansion'],
  service_dashboard: ['service_growth', 'capacity_expansion', 'inventory_expansion', 'campaign_acceleration'],
  stylist_dashboard: ['stylist_capacity_growth'],
  capital_queue: null, // all types
  expansion_planner: ['location_expansion', 'new_location_launch'],
};

/* ── Surfacing Limits ── */
export const SURFACING_LIMITS = {
  perLocalView: 2,
  perOwnerView: 3,
} as const;

/* ── Variance Thresholds — re-exported from canonical ── */
export { CANONICAL_VARIANCE_THRESHOLDS as VARIANCE_THRESHOLDS } from './capital-formulas-config';

/** @deprecated Use calculateForecastStatus from capital-formulas.ts */
export { calculateForecastStatus as getPerformanceStatus } from '@/lib/capital-engine/capital-formulas';
