/**
 * PR 4 enhancement — Goal velocity helpers.
 *
 * Pure functions that turn the existing 14-day redemption series + current
 * goal state into operator-actionable signals:
 *
 *   - `forecastDaysToCap`  — extrapolates days-until-cap-hit from recent
 *     velocity. Lets the operator pre-empt suppression instead of
 *     discovering it after-the-fact.
 *   - `suggestCapBump`     — when a cap fires AND the deadline hasn't,
 *     sizes a "raise by N" nudge from recent velocity instead of the
 *     fixed +50% fallback. Floors to the nearest 5 so the suggestion
 *     reads like a number a human would pick.
 *   - `summarizeGoalHistory` — collapses the recent goal-runs log into
 *     a single recalibration nudge ("last 3 hit cap in <48h").
 *
 * Honest silence: every helper returns `null` when the input signal is
 * too thin to support a confident recommendation. Materiality > false
 * confidence — these surfaces feed an operator decision, not telemetry.
 */

/** Minimum non-zero days in the trailing series before we report a forecast.
 *  3 days isn't a lot, but the redemption funnel is bursty enough that
 *  fewer than that produces wildly noisy "1 day to cap" projections. */
export const MIN_VELOCITY_DAYS_FOR_FORECAST = 3;

/** Materiality gate for the goal-history nudge — at least N completed runs
 *  before we summarize a pattern. With 1–2 runs operators are still
 *  exploring; the nudge would just be noise. */
export const MIN_GOAL_RUNS_FOR_NUDGE = 3;

/** Minimum suggested bump. Below this the nudge feels insulting ("add 1?"). */
const MIN_SUGGESTED_BUMP = 5;

/** Round up to the nearest 5 — operators pick round numbers; respect that. */
function roundUpTo5(n: number): number {
  return Math.max(MIN_SUGGESTED_BUMP, Math.ceil(n / 5) * 5);
}

/**
 * Compute the average daily redemption rate over the trailing window.
 * Excludes the current day-in-progress (last bucket) since it would
 * skew low and trigger pessimistic forecasts mid-morning.
 *
 * Returns null when there isn't enough non-zero history.
 */
export function recentDailyVelocity(series: number[]): number | null {
  if (!Array.isArray(series) || series.length === 0) return null;
  // Drop today (rightmost bucket) — partial day skews velocity.
  const closed = series.slice(0, -1);
  if (closed.length === 0) return null;
  const nonZeroDays = closed.filter((n) => n > 0).length;
  if (nonZeroDays < MIN_VELOCITY_DAYS_FOR_FORECAST) return null;
  const sum = closed.reduce((acc, n) => acc + n, 0);
  return sum / closed.length;
}

export type ForecastResult =
  | { kind: 'unavailable'; reason: 'no-cap' | 'no-velocity' | 'cap-already-hit' }
  | { kind: 'on-pace'; daysUntilCap: number; dailyRate: number };

/**
 * Forecast days until the cap is hit at recent velocity.
 *
 * Inputs intentionally separated from `evaluateGoal` because forecasting
 * needs the velocity series and we don't want the lifecycle hook
 * (suppression check, runs on every public visitor) to depend on it.
 */
export function forecastDaysToCap(args: {
  cap: number | null | undefined;
  redemptions: number;
  series: number[];
}): ForecastResult {
  const { cap, redemptions, series } = args;
  if (typeof cap !== 'number' || cap <= 0) {
    return { kind: 'unavailable', reason: 'no-cap' };
  }
  if (redemptions >= cap) {
    return { kind: 'unavailable', reason: 'cap-already-hit' };
  }
  const dailyRate = recentDailyVelocity(series);
  if (dailyRate === null || dailyRate <= 0) {
    return { kind: 'unavailable', reason: 'no-velocity' };
  }
  const remaining = cap - redemptions;
  const days = Math.ceil(remaining / dailyRate);
  return { kind: 'on-pace', daysUntilCap: days, dailyRate };
}

/**
 * Velocity-aware cap-bump suggestion. Used by the "Raise cap" CTA when
 * the goal has fired so the suggestion matches recent demand instead of
 * a flat percentage.
 *
 * Defaults: aim for ~7 more days of headroom, rounded up to the nearest 5,
 * with a hard floor of 10. When velocity is unknown, returns null and the
 * caller should fall back to its own heuristic (we keep that fallback in
 * the card so this helper stays pure).
 */
export function suggestCapBump(args: {
  series: number[];
  /** Days of headroom we want the next cap to last for. Default 7. */
  targetDaysOfHeadroom?: number;
}): number | null {
  const { series, targetDaysOfHeadroom = 7 } = args;
  const dailyRate = recentDailyVelocity(series);
  if (dailyRate === null || dailyRate <= 0) return null;
  const raw = dailyRate * targetDaysOfHeadroom;
  return Math.max(10, roundUpTo5(raw));
}

export interface PromoGoalRun {
  id: string;
  offerCode: string;
  cap: number;
  redemptionsAtHit: number;
  startedAt: string | null;
  hitAt: string;
  daysTaken: number | null;
}

export type GoalHistoryNudge =
  | { kind: 'silent' }
  | {
      kind: 'recalibrate-up';
      runs: number;
      medianDaysTaken: number;
      medianCap: number;
      suggestedNextCap: number;
    };

/**
 * Looks at the trailing goal-run log for ONE offer code and decides
 * whether to surface a "your caps are too low" nudge. We only nudge
 * upward — nudging *down* on quiet promos risks pulling rugs on slow
 * burners that the operator deliberately wants to keep running.
 *
 * Trigger: 3+ runs where median days-taken <= 2. That's "this promo
 * keeps running out fast" in plain terms.
 */
export function summarizeGoalHistory(runs: PromoGoalRun[]): GoalHistoryNudge {
  if (!Array.isArray(runs) || runs.length < MIN_GOAL_RUNS_FOR_NUDGE) {
    return { kind: 'silent' };
  }
  const recent = runs.slice(0, MIN_GOAL_RUNS_FOR_NUDGE);
  const withDays = recent.filter(
    (r): r is PromoGoalRun & { daysTaken: number } =>
      typeof r.daysTaken === 'number' && r.daysTaken >= 0,
  );
  if (withDays.length < MIN_GOAL_RUNS_FOR_NUDGE) {
    return { kind: 'silent' };
  }
  const sortedDays = [...withDays].map((r) => r.daysTaken).sort((a, b) => a - b);
  const sortedCaps = [...withDays].map((r) => r.cap).sort((a, b) => a - b);
  const median = (xs: number[]) => xs[Math.floor(xs.length / 2)];
  const medianDaysTaken = median(sortedDays);
  const medianCap = median(sortedCaps);

  if (medianDaysTaken > 2) return { kind: 'silent' };

  // Suggest doubling the median cap, rounded to the nearest 5.
  // Doubling because hitting cap in <2 days median signals real demand.
  const suggestedNextCap = roundUpTo5(medianCap * 2);

  return {
    kind: 'recalibrate-up',
    runs: withDays.length,
    medianDaysTaken,
    medianCap,
    suggestedNextCap,
  };
}
