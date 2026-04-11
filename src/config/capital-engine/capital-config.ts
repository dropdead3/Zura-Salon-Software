/**
 * Capital & Expansion Engine Configuration
 *
 * SPI weights, ROE thresholds, risk factor definitions, expansion type labels.
 */

// ── SPI Component Weights (must sum to 1.0) ──────────────────────────

export const SPI_WEIGHTS = {
  revenueEfficiency: 0.25,
  growthVelocity: 0.20,
  conversionStrength: 0.15,
  pricingPower: 0.15,
  operationalStability: 0.15,
  executionQuality: 0.10,
} as const;

// ── SPI Tier Thresholds ──────────────────────────────────────────────

export interface SPITier {
  key: string;
  label: string;
  min: number;
  max: number;
}

export const SPI_TIERS: SPITier[] = [
  { key: 'elite', label: 'Elite Performer', min: 85, max: 100 },
  { key: 'high', label: 'High Performer', min: 70, max: 84 },
  { key: 'growth', label: 'Growth Opportunity', min: 50, max: 69 },
  { key: 'underperforming', label: 'Underperforming', min: 0, max: 49 },
];

export function getSPITier(score: number): SPITier {
  return SPI_TIERS.find(t => score >= t.min && score <= t.max) ?? SPI_TIERS[SPI_TIERS.length - 1];
}

// ── ROE Thresholds ───────────────────────────────────────────────────

export const ROE_THRESHOLDS = {
  /** Below this ROE, opportunity is not worth pursuing */
  minimum: 1.0,
  /** Good return */
  good: 1.5,
  /** Excellent return */
  excellent: 2.0,
  /** Exceptional return */
  exceptional: 3.0,
} as const;

export function getROELabel(roe: number): string {
  if (roe >= ROE_THRESHOLDS.exceptional) return 'Exceptional';
  if (roe >= ROE_THRESHOLDS.excellent) return 'Excellent';
  if (roe >= ROE_THRESHOLDS.good) return 'Good';
  if (roe >= ROE_THRESHOLDS.minimum) return 'Marginal';
  return 'Below Threshold';
}

// ── Confidence Multipliers ───────────────────────────────────────────

export const CONFIDENCE_MULTIPLIERS: Record<string, number> = {
  high: 1.0,
  medium: 1.3,
  low: 1.6,
};

// ── Expansion Opportunity Types ──────────────────────────────────────

export const EXPANSION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  location_expansion: {
    label: 'Location Expansion',
    description: 'Add chairs, extend hours, or expand capacity at an existing location.',
  },
  new_location: {
    label: 'New Location',
    description: 'Open a new salon in an underserved area or high-demand market.',
  },
  category_expansion: {
    label: 'Category Expansion',
    description: 'Introduce a new service category (e.g., extensions, blonding) at an existing location.',
  },
  acquisition: {
    label: 'Acquisition Target',
    description: 'Acquire an underperforming salon in a high-demand area.',
  },
};

// ── Risk Factor Definitions ──────────────────────────────────────────

export interface RiskFactorDef {
  key: string;
  label: string;
  description: string;
  weight: number;
}

export const RISK_FACTORS: RiskFactorDef[] = [
  {
    key: 'volatility',
    label: 'Revenue Volatility',
    description: 'Revenue variance coefficient over the trailing 90 days.',
    weight: 0.30,
  },
  {
    key: 'stylist_dependency',
    label: 'Stylist Dependency',
    description: 'Revenue concentration in top stylists — high means key-person risk.',
    weight: 0.25,
  },
  {
    key: 'competition_intensity',
    label: 'Competition Intensity',
    description: 'Local competitive density from domination engine data.',
    weight: 0.25,
  },
  {
    key: 'market_saturation',
    label: 'Market Saturation',
    description: 'Category saturation signal from industry intelligence.',
    weight: 0.20,
  },
];

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
  very_high: 'Very High Risk',
};

// ── Expansion Status Labels ──────────────────────────────────────────

export const EXPANSION_STATUS_LABELS: Record<string, string> = {
  identified: 'Identified',
  evaluating: 'Evaluating',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  dismissed: 'Dismissed',
};
