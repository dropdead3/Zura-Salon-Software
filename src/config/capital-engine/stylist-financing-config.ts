/**
 * Stylist-Level Financing & Ownership Path — Configuration
 *
 * Career stage definitions, SPI/ORS weights, micro-financing thresholds,
 * and repayment model defaults. All deterministic — no AI.
 */

/* ── Stylist SPI Weights (must sum to 1.0) ── */
export const STYLIST_SPI_WEIGHTS = {
  revenue: 0.25,
  retention: 0.20,
  rebooking: 0.15,
  execution: 0.15,
  growth: 0.15,
  review: 0.10,
} as const;

/* ── ORS Weights (must sum to 1.0) ── */
export const ORS_WEIGHTS = {
  spiAverage: 0.40,
  consistency: 0.25,
  leadership: 0.20,
  demandStability: 0.15,
} as const;

/* ── Career Stages ── */
export const CAREER_STAGES = {
  stylist: {
    key: 'stylist',
    label: 'Stylist',
    order: 1,
    description: 'Building clientele, learning the system',
    spiMin: 0,
    orsMin: null,
  },
  high_performer: {
    key: 'high_performer',
    label: 'High Performer',
    order: 2,
    description: 'High revenue, strong retention, strong execution',
    spiMin: 70,
    orsMin: null,
  },
  lead: {
    key: 'lead',
    label: 'Lead / Micro-Operator',
    order: 3,
    description: 'Mentors others, consistent output, handles responsibility',
    spiMin: 80,
    orsMin: null,
    leadershipMin: 60,
  },
  operator: {
    key: 'operator',
    label: 'Operator',
    order: 4,
    description: 'Runs a book + team, eligible for ownership',
    spiMin: 80,
    orsMin: 70,
    consistencyMin: 70,
  },
  owner: {
    key: 'owner',
    label: 'Owner',
    order: 5,
    description: 'Equity stake, expansion eligible',
    spiMin: 85,
    orsMin: 85,
  },
} as const;

export type CareerStageKey = keyof typeof CAREER_STAGES;

export const CAREER_STAGES_ORDERED: CareerStageKey[] = [
  'stylist',
  'high_performer',
  'lead',
  'operator',
  'owner',
];

export function getCareerStage(key: string) {
  return CAREER_STAGES[key as CareerStageKey] ?? CAREER_STAGES.stylist;
}

/* ── Stylist SPI Tier Thresholds ── */
export const STYLIST_SPI_TIERS = {
  elite: { min: 85, label: 'Elite', color: 'text-green-500' },
  high: { min: 70, label: 'High Performer', color: 'text-blue-500' },
  growth: { min: 50, label: 'Growth', color: 'text-amber-500' },
  underperforming: { min: 0, label: 'Developing', color: 'text-muted-foreground' },
} as const;

export function getSPITierKey(score: number): keyof typeof STYLIST_SPI_TIERS {
  if (score >= STYLIST_SPI_TIERS.elite.min) return 'elite';
  if (score >= STYLIST_SPI_TIERS.high.min) return 'high';
  if (score >= STYLIST_SPI_TIERS.growth.min) return 'growth';
  return 'underperforming';
}

/* ── Micro-Financing Use Case Thresholds ── */
export const MICRO_FINANCING_USE_CASES = {
  marketing_boost: {
    key: 'marketing_boost',
    label: 'Marketing Boost',
    description: 'Accelerate client acquisition',
    spiMin: 65,
    orsMin: null,
    maxAmount: 5_000,
    typicalRange: '$1K–$5K',
  },
  inventory_scaling: {
    key: 'inventory_scaling',
    label: 'Inventory Scaling',
    description: 'Increase capacity for extension clients',
    spiMin: 70,
    orsMin: null,
    maxAmount: 10_000,
    typicalRange: '$3K–$10K',
  },
  chair_expansion: {
    key: 'chair_expansion',
    label: 'Chair Expansion',
    description: 'Add chairs and take junior stylists',
    spiMin: 75,
    orsMin: 60,
    maxAmount: 15_000,
    typicalRange: '$5K–$15K',
  },
  mini_location: {
    key: 'mini_location',
    label: 'Mini Location Launch',
    description: 'First step toward ownership',
    spiMin: 80,
    orsMin: 75,
    maxAmount: 50_000,
    typicalRange: '$15K–$50K',
  },
} as const;

export type MicroFinancingUseCase = keyof typeof MICRO_FINANCING_USE_CASES;

/* ── Repayment Models ── */
export const REPAYMENT_MODELS = {
  fixed: {
    key: 'fixed',
    label: 'Fixed',
    description: 'Equal monthly payments',
  },
  revenue_based: {
    key: 'revenue_based',
    label: 'Revenue-Based',
    description: '% of service revenue until repaid',
    defaultSharePct: 10,
    minSharePct: 5,
    maxSharePct: 15,
  },
  hybrid: {
    key: 'hybrid',
    label: 'Hybrid',
    description: 'Minimum payment + % of upside above baseline',
  },
} as const;

/* ── Milestone Types ── */
export const MILESTONE_TYPES = {
  stage_promotion: { label: 'Stage Promotion', icon: '🏆' },
  financing_unlock: { label: 'Financing Unlocked', icon: '🔓' },
  ownership_eligible: { label: 'Ownership Eligible', icon: '🏠' },
} as const;

/* ── Minimum SPI history for ORS consistency calculation ── */
export const ORS_MIN_HISTORY_MONTHS = 6;
export const ORS_INSUFFICIENT_HISTORY_PENALTY = 0.7;
