/**
 * Industry Intelligence Layer Configuration.
 * Signal types, confidence thresholds, cohort minimums, trend detection parameters.
 */

export type IndustrySignalType =
  | 'demand_shift'
  | 'keyword_trend'
  | 'price_signal'
  | 'effectiveness_pattern'
  | 'conversion_pattern';

export type TrendDirection = 'rising' | 'stable' | 'declining';
export type TrendConfidence = 'low' | 'medium' | 'high';

/** Minimum number of organizations required to publish a signal */
export const MIN_COHORT_SIZE = 5;

/** Trend detection thresholds (percentage change between rolling windows) */
export const TREND_THRESHOLDS: Record<IndustrySignalType, { rising: number; declining: number }> = {
  demand_shift: { rising: 15, declining: -15 },
  keyword_trend: { rising: 10, declining: -10 },
  price_signal: { rising: 10, declining: -10 },
  effectiveness_pattern: { rising: 15, declining: -15 },
  conversion_pattern: { rising: 10, declining: -10 },
};

/** Confidence assignment rules */
export const CONFIDENCE_RULES = {
  high: { minCohort: 20, minConsistentWeeks: 3 },
  medium: { minCohort: 10, minConsistentWeeks: 2 },
  low: { minCohort: 5, minConsistentWeeks: 1 },
} as const;

/** Rolling window size in days for trend comparison */
export const ROLLING_WINDOW_DAYS = 28;

/** Signal expiry in days */
export const SIGNAL_EXPIRY_DAYS = 14;

/** Signal type labels for display */
export const SIGNAL_TYPE_LABELS: Record<IndustrySignalType, string> = {
  demand_shift: 'Demand Shift',
  keyword_trend: 'Keyword Trend',
  price_signal: 'Price Signal',
  effectiveness_pattern: 'Effectiveness Pattern',
  conversion_pattern: 'Conversion Pattern',
};

/** Direction display config */
export const DIRECTION_CONFIG: Record<TrendDirection, { label: string; icon: string; color: string }> = {
  rising: { label: 'Rising', icon: '↑', color: 'text-green-500' },
  stable: { label: 'Stable', icon: '→', color: 'text-muted-foreground' },
  declining: { label: 'Declining', icon: '↓', color: 'text-red-500' },
};

/** Confidence display config */
export const CONFIDENCE_CONFIG: Record<TrendConfidence, { label: string; color: string }> = {
  high: { label: 'High confidence', color: 'text-green-600' },
  medium: { label: 'Medium confidence', color: 'text-amber-600' },
  low: { label: 'Low confidence', color: 'text-muted-foreground' },
};

/** Benchmark metric keys tracked at the network level */
export const BENCHMARK_METRIC_KEYS = [
  'review_velocity',
  'content_volume',
  'avg_ticket',
  'conversion_rate',
  'page_health_score',
] as const;

export type BenchmarkMetricKey = (typeof BENCHMARK_METRIC_KEYS)[number];

export const BENCHMARK_METRIC_LABELS: Record<BenchmarkMetricKey, string> = {
  review_velocity: 'Review Velocity',
  content_volume: 'Content Volume',
  avg_ticket: 'Avg Ticket',
  conversion_rate: 'Conversion Rate',
  page_health_score: 'Page Health Score',
};
