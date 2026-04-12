/**
 * Zura Capital — Deterministic Formulas Configuration
 *
 * Single source of truth for all scoring weights, thresholds,
 * reason codes, and explanation templates.
 *
 * No business logic here — only constants.
 */

/* ── ROE Score Range ── */
export const ROE_SCORE_RANGE = { min: 0.5, max: 3.0 } as const;

/* ── Break-Even Range (months) ── */
export const BREAK_EVEN_RANGE = { min: 0, max: 18 } as const;

/* ── Freshness Decay Thresholds ── */
export const FRESHNESS_DECAY = [
  { maxDays: 7, multiplier: 1.0 },
  { maxDays: 14, multiplier: 0.95 },
  { maxDays: 30, multiplier: 0.85 },
  { maxDays: 45, multiplier: 0.70 },
] as const;
export const FRESHNESS_FLOOR_MULTIPLIER = 0.50;

/* ── Surface Priority Weights (must sum to 1.0) ── */
export const CANONICAL_SURFACE_PRIORITY_WEIGHTS = {
  roe: 0.30,
  confidence: 0.20,
  businessValue: 0.15,
  breakEven: 0.10,
  momentum: 0.10,
  constraintSeverity: 0.10,
  netImpact: 0.05,
} as const;

/* ── Confidence Score Weights (must sum to 1.0) ── */
export const CONFIDENCE_WEIGHTS = {
  historicalAccuracy: 0.30,
  operationalStability: 0.20,
  executionReadiness: 0.20,
  breakEven: 0.10,
  momentum: 0.10,
  freshness: 0.10,
} as const;

/* ── Risk Score Weights (must sum to 1.0) ── */
export const RISK_WEIGHTS = {
  instability: 0.25,
  uncertainty: 0.20,
  underperformance: 0.20,
  projectLoad: 0.15,
  repayment: 0.10,
  momentum: 0.10,
} as const;

/* ── Risk Level Thresholds ── */
export const RISK_LEVEL_THRESHOLDS = {
  low: { min: 0, max: 34 },
  medium: { min: 35, max: 59 },
  high: { min: 60, max: 79 },
  critical: { min: 80, max: 100 },
} as const;

export type CanonicalRiskLevel = keyof typeof RISK_LEVEL_THRESHOLDS;

/* ── Variance Thresholds ── */
export const CANONICAL_VARIANCE_THRESHOLDS = {
  aboveForecast: 15,
  onTrackLow: -10,
  belowForecast: -25,
} as const;

/* ── Coverage Tiers ── */
export const COVERAGE_TIERS = {
  full: { min: 1.0, label: 'Full' },
  strong: { min: 0.75, label: 'Strong' },
  partial: { min: 0.50, label: 'Partial' },
  weak: { min: 0, label: 'Weak' },
} as const;

export type CoverageTier = keyof typeof COVERAGE_TIERS;

/* ── Staleness Penalties ── */
export const STALENESS_PENALTIES = [
  { maxDays: 7, penalty: 0 },
  { maxDays: 14, penalty: 5 },
  { maxDays: 30, penalty: 10 },
] as const;
export const STALENESS_PENALTY_FLOOR = 20;

/* ── Dismissal Penalties ── */
export const DISMISSAL_PENALTY_PER = 5;
export const DISMISSAL_PENALTY_MAX = 20;

/* ── Coverage Penalties ── */
export const COVERAGE_PENALTIES = {
  strong: 0,   // >= 0.75
  partial: 5,  // 0.50–0.74
  weak: 10,    // < 0.50
} as const;

/* ── Project Load Penalty ── */
export const PROJECT_LOAD_PENALTY_PER = 10;

/* ── Constraint Severity Map ── */
export const CANONICAL_CONSTRAINT_SEVERITY: Record<string, number> = {
  capacity_bottleneck: 90,
  service_waitlist_pressure: 85,
  inventory_bottleneck: 80,
  understocking_risk: 75,
  strong_demand: 70,
  stylist_ready_to_scale: 60,
  market_opportunity: 55,
  page_or_campaign_growth_gap: 50,
};
export const CONSTRAINT_SEVERITY_DEFAULT = 30;

/* ── Net Impact Score Range ── */
export const NET_IMPACT_RATIO_MAX = 0.25;

/* ── Default Policy ── */
export const DEFAULT_CAPITAL_POLICY = {
  roeThreshold: 1.8,
  confidenceThreshold: 70,
  maxRiskLevel: 'medium' as CanonicalRiskLevel,
  minOperationalStability: 60,
  minExecutionReadiness: 70,
  maxConcurrentProjects: 2,
  cooldownAfterDeclineDays: 14,
  cooldownAfterUnderperformanceDays: 30,
  staleDays: 45,
  stylistSpiThreshold: 80,
  stylistOrsThreshold: 85,
  maxExposurePerLocation: 200_000,
  maxExposurePerStylist: 50_000,
  minCapitalRequired: 5_000,
  allowManagerInitiation: false,
  allowStylistMicrofunding: true,
} as const;

export type CapitalPolicy = typeof DEFAULT_CAPITAL_POLICY;

/* ── Reason Codes ── */
export const REASON_CODES = {
  low_roe: 'low_roe',
  low_confidence: 'low_confidence',
  risk_too_high: 'risk_too_high',
  instability: 'instability',
  too_many_active_projects: 'too_many_active_projects',
  underperforming_project_exists: 'underperforming_project_exists',
  repayment_distress: 'repayment_distress',
  execution_not_ready: 'execution_not_ready',
  opportunity_stale: 'opportunity_stale',
  invalid_investment: 'invalid_investment',
  opportunity_expired: 'opportunity_expired',
  no_constraint_type: 'no_constraint_type',
  momentum_decline: 'momentum_decline',
  location_exposure_exceeded: 'location_exposure_exceeded',
  stylist_exposure_exceeded: 'stylist_exposure_exceeded',
  decline_cooldown: 'decline_cooldown',
  underperformance_cooldown: 'underperformance_cooldown',
  critical_ops_alerts: 'critical_ops_alerts',
  capital_below_minimum: 'capital_below_minimum',
  // Stylist-specific
  stylist_spi_too_low: 'stylist_spi_too_low',
  stylist_ors_too_low: 'stylist_ors_too_low',
  stylist_microfunding_disabled: 'stylist_microfunding_disabled',
  stylist_demand_too_low: 'stylist_demand_too_low',
} as const;

export type ReasonCode = typeof REASON_CODES[keyof typeof REASON_CODES];

/* ── Explanation Templates ── */
export const EXPLANATION_TEMPLATES: Record<string, string> = {
  [REASON_CODES.low_roe]: 'This opportunity does not currently meet the minimum return threshold for growth funding.',
  [REASON_CODES.low_confidence]: 'This opportunity does not yet have enough forecast confidence to justify capital deployment.',
  [REASON_CODES.risk_too_high]: 'Current operational or repayment risk is too high to recommend new funding at this time.',
  [REASON_CODES.instability]: 'Operational stability is below the required threshold for capital deployment.',
  [REASON_CODES.too_many_active_projects]: 'The organization has reached its maximum concurrent funded projects.',
  [REASON_CODES.underperforming_project_exists]: 'An active funded project is underperforming, blocking new capital deployment.',
  [REASON_CODES.repayment_distress]: 'Active repayment distress must be resolved before new funding.',
  [REASON_CODES.execution_not_ready]: 'Execution readiness is below the threshold for reliable deployment.',
  [REASON_CODES.opportunity_stale]: 'This opportunity has aged beyond the maximum allowed freshness window.',
  [REASON_CODES.invalid_investment]: 'The required investment amount is invalid or below the minimum threshold.',
  [REASON_CODES.opportunity_expired]: 'This opportunity has expired.',
  [REASON_CODES.no_constraint_type]: 'No clear business constraint identified — unclear use of funds.',
  [REASON_CODES.momentum_decline]: 'Severe momentum decline makes capital deployment inadvisable.',
  [REASON_CODES.location_exposure_exceeded]: 'Location-level capital exposure would exceed the policy limit.',
  [REASON_CODES.stylist_exposure_exceeded]: 'Stylist-level capital exposure would exceed the policy limit.',
  [REASON_CODES.decline_cooldown]: 'A recent decline is still within the cooldown period.',
  [REASON_CODES.underperformance_cooldown]: 'A recent underperformance event is still within the cooldown period.',
  [REASON_CODES.critical_ops_alerts]: 'Unresolved critical operational alerts block new capital deployment.',
  [REASON_CODES.capital_below_minimum]: 'The required capital amount is below the minimum financing threshold.',
  [REASON_CODES.stylist_spi_too_low]: 'Stylist SPI is below the threshold for personal growth funding.',
  [REASON_CODES.stylist_ors_too_low]: 'Stylist ORS is below the threshold for expansion-level funding.',
  [REASON_CODES.stylist_microfunding_disabled]: 'Stylist micro-funding is not enabled for this organization.',
  [REASON_CODES.stylist_demand_too_low]: 'Stylist demand support score is below the threshold for growth funding.',
};

/* ── Forecast Status ── */
export type ForecastStatus = 'early_tracking' | 'above_forecast' | 'on_track' | 'below_forecast' | 'at_risk';

/* ── Surface Cooldown Defaults (days) — canonical ── */
export const CANONICAL_SURFACE_COOLDOWNS: Record<string, number> = {
  command_center: 7,
  ops_hub: 3,
  service_dashboard: 5,
  stylist_dashboard: 14,
  expansion_planner: 7,
  capital_queue: 0,
};

/* ── Business Value Weights (must sum to 1.0) ── */
export const BUSINESS_VALUE_WEIGHTS = {
  serviceMargin: 0.30,
  revenuePotential: 0.30,
  strategicServiceWeight: 0.20,
  locationPriority: 0.20,
} as const;
