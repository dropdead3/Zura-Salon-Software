/**
 * SEO Industry Intelligence Engine.
 * Pure computation: trend detection, percentile benchmarking,
 * demand shift classification, "what's working" pattern matching.
 * All logic is deterministic — AI generates explanation text only.
 */

import {
  type IndustrySignalType,
  type TrendDirection,
  type TrendConfidence,
  TREND_THRESHOLDS,
  CONFIDENCE_RULES,
  MIN_COHORT_SIZE,
} from '@/config/seo-engine/seo-industry-config';

// ── Types ──

export interface RollingWindowData {
  signalType: IndustrySignalType;
  category: string;
  city?: string;
  metricKey: string;
  currentValue: number;
  previousValue: number;
  cohortSize: number;
  consistentWeeks: number;
}

export interface DetectedTrend {
  signalType: IndustrySignalType;
  category: string;
  city?: string;
  metricKey: string;
  currentValue: number;
  previousValue: number;
  deltaPct: number;
  direction: TrendDirection;
  cohortSize: number;
  confidence: TrendConfidence;
}

export interface PercentileBand {
  category: string;
  city?: string;
  metricKey: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  cohortSize: number;
}

export interface OrgPercentilePosition {
  metricKey: string;
  orgValue: number;
  percentile: number;
  direction: TrendDirection;
}

// ── Trend Detection ──

/**
 * Classify direction from a percentage delta using signal-type-specific thresholds.
 */
export function classifyDirection(deltaPct: number, signalType: IndustrySignalType): TrendDirection {
  const thresholds = TREND_THRESHOLDS[signalType];
  if (deltaPct >= thresholds.rising) return 'rising';
  if (deltaPct <= thresholds.declining) return 'declining';
  return 'stable';
}

/**
 * Assign confidence level based on cohort size and consistency.
 */
export function assignConfidence(cohortSize: number, consistentWeeks: number): TrendConfidence {
  if (cohortSize >= CONFIDENCE_RULES.high.minCohort && consistentWeeks >= CONFIDENCE_RULES.high.minConsistentWeeks) {
    return 'high';
  }
  if (cohortSize >= CONFIDENCE_RULES.medium.minCohort && consistentWeeks >= CONFIDENCE_RULES.medium.minConsistentWeeks) {
    return 'medium';
  }
  return 'low';
}

/**
 * Detect trends from rolling window data.
 * Filters out signals below minimum cohort size.
 */
export function detectTrends(windowData: RollingWindowData[]): DetectedTrend[] {
  const trends: DetectedTrend[] = [];

  for (const w of windowData) {
    if (w.cohortSize < MIN_COHORT_SIZE) continue;

    const deltaPct = w.previousValue !== 0
      ? ((w.currentValue - w.previousValue) / Math.abs(w.previousValue)) * 100
      : w.currentValue > 0 ? 100 : 0;

    const direction = classifyDirection(deltaPct, w.signalType);

    // Only emit non-stable signals
    if (direction === 'stable') continue;

    const confidence = assignConfidence(w.cohortSize, w.consistentWeeks);

    trends.push({
      signalType: w.signalType,
      category: w.category,
      city: w.city,
      metricKey: w.metricKey,
      currentValue: w.currentValue,
      previousValue: w.previousValue,
      deltaPct: Math.round(deltaPct * 10) / 10,
      direction,
      cohortSize: w.cohortSize,
      confidence,
    });
  }

  // Sort by confidence (high first), then by absolute delta
  const confOrder: Record<TrendConfidence, number> = { high: 0, medium: 1, low: 2 };
  trends.sort((a, b) => {
    const confDiff = confOrder[a.confidence] - confOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
  });

  return trends;
}

// ── Percentile Benchmarking ──

/**
 * Compute percentile bands from an array of numeric values.
 */
export function computePercentiles(values: number[]): { p25: number; p50: number; p75: number; p90: number } {
  if (values.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  };

  return {
    p25: Math.round(percentile(25) * 100) / 100,
    p50: Math.round(percentile(50) * 100) / 100,
    p75: Math.round(percentile(75) * 100) / 100,
    p90: Math.round(percentile(90) * 100) / 100,
  };
}

/**
 * Determine an org's percentile position relative to a benchmark band.
 */
export function computeOrgPercentile(
  orgValue: number,
  band: PercentileBand,
  previousOrgValue?: number,
): OrgPercentilePosition {
  // Approximate percentile using linear interpolation between known bands
  let percentile: number;
  if (orgValue <= band.p25) {
    percentile = (orgValue / Math.max(band.p25, 0.01)) * 25;
  } else if (orgValue <= band.p50) {
    percentile = 25 + ((orgValue - band.p25) / Math.max(band.p50 - band.p25, 0.01)) * 25;
  } else if (orgValue <= band.p75) {
    percentile = 50 + ((orgValue - band.p50) / Math.max(band.p75 - band.p50, 0.01)) * 25;
  } else if (orgValue <= band.p90) {
    percentile = 75 + ((orgValue - band.p75) / Math.max(band.p90 - band.p75, 0.01)) * 15;
  } else {
    percentile = 90 + Math.min(((orgValue - band.p90) / Math.max(band.p90, 0.01)) * 10, 10);
  }

  percentile = Math.min(Math.max(Math.round(percentile), 0), 100);

  let direction: TrendDirection = 'stable';
  if (previousOrgValue !== undefined) {
    const delta = orgValue - previousOrgValue;
    if (delta > 0) direction = 'rising';
    else if (delta < 0) direction = 'declining';
  }

  return {
    metricKey: band.metricKey,
    orgValue,
    percentile,
    direction,
  };
}

// ── "What's Working Now" Feed ──

/**
 * Rank trends for the "What's Working Now" feed.
 * Returns top N signals sorted by confidence × relevance.
 */
export function rankWhatsWorking(
  trends: DetectedTrend[],
  orgActiveCategories?: string[],
  limit = 5,
): DetectedTrend[] {
  const scored = trends.map((t) => {
    let relevanceScore = 1;
    // Boost signals matching org's active categories
    if (orgActiveCategories?.includes(t.category)) {
      relevanceScore = 2;
    }
    // Boost effectiveness and conversion patterns (most actionable)
    if (t.signalType === 'effectiveness_pattern' || t.signalType === 'conversion_pattern') {
      relevanceScore *= 1.5;
    }
    const confMultiplier = t.confidence === 'high' ? 3 : t.confidence === 'medium' ? 2 : 1;
    return { trend: t, score: confMultiplier * relevanceScore * Math.abs(t.deltaPct) };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.trend);
}
