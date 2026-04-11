/**
 * SEO Impact Tracker.
 * Post-completion measurement: 7d, 30d, 90d deltas.
 * Contribution-confidence model.
 */

export type MeasurementWindow = '7d' | '30d' | '90d';

export interface ImpactMetrics {
  review_velocity_delta?: number;
  keyword_mentions_delta?: number;
  page_completeness_delta?: number;
  page_traffic_delta?: number;
  booking_conversion_delta?: number;
  gbp_freshness_delta?: number;
  ranking_movement_delta?: number;
  competitor_distance_delta?: number;
}

/**
 * Contribution confidence model.
 * Confidence is based on:
 * 1. Temporal proximity — impact measured closer to completion has higher confidence
 * 2. Isolation — fewer concurrent tasks on the same object = higher confidence
 * 3. Expected impact category alignment — if the delta aligns with the template's expected impact, confidence is higher
 */
export function computeContributionConfidence({
  window,
  concurrentTaskCount,
  expectedCategory,
  actualMetrics,
}: {
  window: MeasurementWindow;
  concurrentTaskCount: number;
  expectedCategory: string;
  actualMetrics: ImpactMetrics;
}): number {
  // Base confidence by window (closer = more attributable)
  const windowBase: Record<MeasurementWindow, number> = {
    '7d': 0.8,
    '30d': 0.5,
    '90d': 0.3,
  };

  let confidence = windowBase[window] ?? 0.3;

  // Isolation factor: fewer concurrent tasks = higher confidence
  if (concurrentTaskCount <= 1) {
    confidence *= 1.0;
  } else if (concurrentTaskCount <= 3) {
    confidence *= 0.7;
  } else {
    confidence *= 0.4;
  }

  // Category alignment: does the expected category have a positive delta?
  const categoryMetricMap: Record<string, keyof ImpactMetrics> = {
    review_velocity: 'review_velocity_delta',
    content_freshness: 'page_completeness_delta',
    page_health: 'page_traffic_delta',
    local_presence: 'gbp_freshness_delta',
    booking_conversion: 'booking_conversion_delta',
    competitive_position: 'competitor_distance_delta',
  };

  const metricKey = categoryMetricMap[expectedCategory];
  if (metricKey && actualMetrics[metricKey] !== undefined) {
    const delta = actualMetrics[metricKey] ?? 0;
    if (delta > 0) {
      confidence *= 1.2; // Positive movement in expected category
    } else if (delta < 0) {
      confidence *= 0.5; // Negative movement — low attribution
    }
  }

  return Math.min(Math.max(Math.round(confidence * 100) / 100, 0), 1);
}

/**
 * Map expected impact category to the primary metric for summary display.
 */
export const IMPACT_CATEGORY_LABELS: Record<string, string> = {
  review_velocity: 'Review Velocity',
  content_freshness: 'Content Freshness',
  page_health: 'Page Health',
  local_presence: 'Local Presence',
  booking_conversion: 'Booking Conversion',
  competitive_position: 'Competitive Position',
};
