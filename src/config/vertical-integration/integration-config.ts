/**
 * Vertical Integration Engine — Configuration
 *
 * Preferred supplier labels, threshold defaults, scoring weights,
 * and margin comparison thresholds.
 */

export const PREFERRED_SUPPLIER_LABEL = 'Drop Dead';

export const SCORING_WEIGHTS = {
  margin: 0.4,
  usageFrequency: 0.25,
  preferredBonus: 0.2,
  consistency: 0.15,
} as const;

export const REPLENISHMENT_DEFAULTS = {
  thresholdType: 'days_of_stock' as const,
  thresholdValue: 7,
  requireApproval: true,
  maxOrderValue: null as number | null,
} as const;

export const MARGIN_THRESHOLDS = {
  /** Minimum margin delta (pp) to surface a brand-switch recommendation */
  minDeltaToRecommend: 5,
  /** Margin below this % triggers a warning */
  lowMarginWarning: 30,
  /** Margin below this % triggers a critical alert */
  criticalMarginAlert: 15,
} as const;

export const PERFORMANCE_AGGREGATION = {
  /** Trailing window in days for aggregation */
  trailingDays: 30,
  /** Minimum org cohort size for platform-level anonymized data */
  minCohortSize: 5,
} as const;
