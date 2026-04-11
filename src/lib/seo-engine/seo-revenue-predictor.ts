/**
 * SEO Revenue Predictor.
 * Deterministic prediction engine: baseline → task coefficients → weakness adjustment → momentum modifier → prediction bands.
 * No AI involvement in calculations.
 */

// ── Task-Type Impact Coefficients ──────────────────────────────────
// Each value = percentage lift on baseline bookings (low / expected / high)
export interface LiftRange {
  low: number;
  expected: number;
  high: number;
}

export const TASK_TYPE_COEFFICIENTS: Record<string, LiftRange> = {
  review_request:              { low: 0.01, expected: 0.03, high: 0.05 },
  photo_upload:                { low: 0.005, expected: 0.02, high: 0.04 },
  page_completion:             { low: 0.02, expected: 0.05, high: 0.08 },
  faq_expansion:               { low: 0.005, expected: 0.015, high: 0.03 },
  gbp_post:                    { low: 0.005, expected: 0.015, high: 0.03 },
  service_description_rewrite: { low: 0.01, expected: 0.025, high: 0.04 },
  booking_cta_optimization:    { low: 0.02, expected: 0.04, high: 0.07 },
  before_after_publish:        { low: 0.01, expected: 0.02, high: 0.04 },
};

// Fallback for unknown template keys
const DEFAULT_COEFFICIENT: LiftRange = { low: 0.005, expected: 0.015, high: 0.03 };

// ── Template → Health Domain mapping for weakness adjustment ──────
const TEMPLATE_DOMAIN_MAP: Record<string, string> = {
  review_request: 'review',
  photo_upload: 'content',
  page_completion: 'page',
  faq_expansion: 'content',
  gbp_post: 'local_presence',
  service_description_rewrite: 'content',
  booking_cta_optimization: 'conversion',
  before_after_publish: 'content',
};

// ── Types ──────────────────────────────────────────────────────────

export interface PredictionBaseline {
  bookings30d: number;
  avgTicket: number;
  totalRevenue30d: number;
}

export interface HealthScoreMap {
  review?: number;
  page?: number;
  content?: number;
  local_presence?: number;
  competitive_gap?: number;
  conversion?: number;
}

export interface PendingTask {
  templateKey: string;
  status: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface PredictionResult {
  /** Revenue lift prediction */
  revenueLift: LiftRange;
  /** Booking lift prediction */
  bookingLift: LiftRange;
  /** Confidence level */
  confidence: ConfidenceLevel;
  /** Human-readable reason for confidence */
  confidenceReason: string;
  /** Breakdown by task type */
  factors: PredictionFactor[];
  /** Baseline used */
  baseline: PredictionBaseline;
}

export interface PredictionFactor {
  templateKey: string;
  taskCount: number;
  adjustedLift: LiftRange;
  revenueLift: LiftRange;
}

// ── Weakness Multiplier ───────────────────────────────────────────

function getWeaknessMultiplier(healthScore: number | undefined): number {
  if (healthScore === undefined) return 1.0;
  if (healthScore < 40) return 1.5;
  if (healthScore < 60) return 1.2;
  if (healthScore > 80) return 0.6;
  return 1.0;
}

function getWeaknessMultiplierForTemplate(
  templateKey: string,
  healthScores: HealthScoreMap,
): number {
  const domain = TEMPLATE_DOMAIN_MAP[templateKey];
  if (!domain) return 1.0;
  return getWeaknessMultiplier(healthScores[domain as keyof HealthScoreMap]);
}

// ── Momentum Modifier ─────────────────────────────────────────────

function getMomentumModifier(momentumScore: number | undefined): number {
  if (momentumScore === undefined) return 1.0;
  if (momentumScore > 30) return 0.7;
  if (momentumScore < -30) return 1.3;
  return 1.0;
}

// ── Confidence ────────────────────────────────────────────────────

function computeConfidence(
  baseline: PredictionBaseline,
  healthScores: HealthScoreMap,
  momentumScore: number | undefined,
): { level: ConfidenceLevel; reason: string } {
  const healthCount = Object.keys(healthScores).length;
  const hasMomentum = momentumScore !== undefined;

  if (baseline.bookings30d >= 20 && healthCount >= 3 && hasMomentum) {
    return { level: 'high', reason: `Based on ${baseline.bookings30d} bookings with full signal coverage` };
  }
  if (baseline.bookings30d >= 8) {
    return { level: 'medium', reason: `Based on ${baseline.bookings30d} bookings in baseline` };
  }
  return { level: 'low', reason: baseline.bookings30d > 0
    ? `Limited baseline: only ${baseline.bookings30d} bookings in 30d`
    : 'No booking history available — estimates are directional only' };
}

// ── Main Prediction Function ──────────────────────────────────────

export function computePredictedLift({
  baseline,
  pendingTasks,
  healthScores,
  momentumScore,
}: {
  baseline: PredictionBaseline;
  pendingTasks: PendingTask[];
  healthScores: HealthScoreMap;
  momentumScore?: number;
}): PredictionResult {
  const momentumMod = getMomentumModifier(momentumScore);

  // Group pending tasks by template
  const taskCounts: Record<string, number> = {};
  for (const t of pendingTasks) {
    taskCounts[t.templateKey] = (taskCounts[t.templateKey] || 0) + 1;
  }

  const factors: PredictionFactor[] = [];
  let totalBookingLift: LiftRange = { low: 0, expected: 0, high: 0 };

  for (const [templateKey, count] of Object.entries(taskCounts)) {
    const baseCoeff = TASK_TYPE_COEFFICIENTS[templateKey] ?? DEFAULT_COEFFICIENT;
    const weaknessMult = getWeaknessMultiplierForTemplate(templateKey, healthScores);

    const adjustedLift: LiftRange = {
      low: baseCoeff.low * weaknessMult * momentumMod * count,
      expected: baseCoeff.expected * weaknessMult * momentumMod * count,
      high: baseCoeff.high * weaknessMult * momentumMod * count,
    };

    const revenueLift: LiftRange = {
      low: Math.round(baseline.bookings30d * adjustedLift.low * baseline.avgTicket),
      expected: Math.round(baseline.bookings30d * adjustedLift.expected * baseline.avgTicket),
      high: Math.round(baseline.bookings30d * adjustedLift.high * baseline.avgTicket),
    };

    totalBookingLift.low += baseline.bookings30d * adjustedLift.low;
    totalBookingLift.expected += baseline.bookings30d * adjustedLift.expected;
    totalBookingLift.high += baseline.bookings30d * adjustedLift.high;

    factors.push({ templateKey, taskCount: count, adjustedLift, revenueLift });
  }

  const revenueLift: LiftRange = {
    low: Math.round(totalBookingLift.low * baseline.avgTicket),
    expected: Math.round(totalBookingLift.expected * baseline.avgTicket),
    high: Math.round(totalBookingLift.high * baseline.avgTicket),
  };

  const bookingLift: LiftRange = {
    low: Math.round(totalBookingLift.low * 10) / 10,
    expected: Math.round(totalBookingLift.expected * 10) / 10,
    high: Math.round(totalBookingLift.high * 10) / 10,
  };

  const { level, reason } = computeConfidence(baseline, healthScores, momentumScore);

  return {
    revenueLift,
    bookingLift,
    confidence: level,
    confidenceReason: reason,
    factors,
    baseline,
  };
}

/**
 * Compute remaining lift for a campaign given completed vs total tasks.
 */
export function computeRemainingLift(
  fullPrediction: PredictionResult,
  completedCount: number,
  totalCount: number,
): LiftRange {
  if (totalCount === 0) return { low: 0, expected: 0, high: 0 };
  const remainingRatio = Math.max(0, (totalCount - completedCount) / totalCount);
  return {
    low: Math.round(fullPrediction.revenueLift.low * remainingRatio),
    expected: Math.round(fullPrediction.revenueLift.expected * remainingRatio),
    high: Math.round(fullPrediction.revenueLift.high * remainingRatio),
  };
}
