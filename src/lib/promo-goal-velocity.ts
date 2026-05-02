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

// ─────────────────────────────────────────────────────────────────────────────
// Cross-code pattern resolver
//
// Operators run many promos. Once enough goal-runs accumulate ACROSS codes,
// we can surface comparative patterns ("free-* hits cap 3× faster than
// discount-*") that no single-code log can express.
//
// Bucketing strategy:
//   - Tokenize each `offer_code` on `-` / `_` and treat the FIRST segment
//     (lowercased) as the bucket key. Real-world promo codes overwhelmingly
//     follow this pattern: `free-haircut-jan`, `free-gloss`, `discount-25`,
//     `discount-vip`, `flash-friday`. The first token is the *intent*; the
//     rest is the variant. Codes with no separator become their own bucket
//     (a bucket of 1 never triggers — fine).
//
// Materiality gates (kept tight to honor the silence-is-valid doctrine):
//   - At least TWO distinct buckets present.
//   - The two buckets compared each have ≥ MIN_RUNS_PER_BUCKET runs with a
//     non-null `daysTaken`.
//   - Median days-taken ratio between fast and slow bucket must be ≥ 2×
//     (i.e. one bucket genuinely burns through caps twice as fast). Below
//     that the comparison is noise dressed up as signal.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum runs per bucket before we'll compare it. */
export const MIN_RUNS_PER_BUCKET = 3;

/** Minimum speed ratio between fast and slow bucket — 2× means "real". */
const MIN_BUCKET_SPEED_RATIO = 2;

export type CrossCodePattern =
  | { kind: 'silent' }
  | {
      kind: 'cross-code';
      fastBucket: string;
      slowBucket: string;
      fastMedianDays: number;
      slowMedianDays: number;
      ratio: number;
      fastRuns: number;
      slowRuns: number;
    };

/** Strip the variant suffix off an offer code. `free-haircut-jan` → `free`. */
export function bucketKeyForCode(code: string): string {
  const trimmed = (code ?? '').trim().toLowerCase();
  if (!trimmed) return '';
  // Split on common separators; first non-empty token is the bucket.
  const tokens = trimmed.split(/[-_]/).filter(Boolean);
  return tokens[0] ?? trimmed;
}

function median(xs: number[]): number {
  return xs[Math.floor(xs.length / 2)];
}

/**
 * Surface an org-wide cross-code pattern when enough history accumulates.
 * Returns the SINGLE most material comparison (fastest vs slowest qualifying
 * bucket) — we deliberately do NOT enumerate every bucket pair, because the
 * goal is one decisive nudge, not a leaderboard.
 */
export function summarizeCrossCodePattern(runs: PromoGoalRun[]): CrossCodePattern {
  if (!Array.isArray(runs) || runs.length === 0) return { kind: 'silent' };

  const bucketDays = new Map<string, number[]>();
  for (const r of runs) {
    if (typeof r.daysTaken !== 'number' || r.daysTaken < 0) continue;
    const key = bucketKeyForCode(r.offerCode);
    if (!key) continue;
    const arr = bucketDays.get(key) ?? [];
    arr.push(r.daysTaken);
    bucketDays.set(key, arr);
  }

  // Keep only buckets that meet the minimum-runs gate.
  const qualifying = Array.from(bucketDays.entries())
    .filter(([, days]) => days.length >= MIN_RUNS_PER_BUCKET)
    .map(([bucket, days]) => {
      const sorted = [...days].sort((a, b) => a - b);
      return { bucket, runs: days.length, medianDays: median(sorted) };
    });

  if (qualifying.length < 2) return { kind: 'silent' };

  // Fastest = smallest median days. Slowest = largest median days.
  const sortedByDays = [...qualifying].sort((a, b) => a.medianDays - b.medianDays);
  const fast = sortedByDays[0];
  const slow = sortedByDays[sortedByDays.length - 1];

  // Avoid divide-by-zero AND require a real speed gap.
  if (fast.medianDays <= 0) {
    // Fast bucket hits cap "same day" (median 0). Any slow bucket with
    // median ≥ 1 is materially different — surface it.
    if (slow.medianDays < 1) return { kind: 'silent' };
    return {
      kind: 'cross-code',
      fastBucket: fast.bucket,
      slowBucket: slow.bucket,
      fastMedianDays: fast.medianDays,
      slowMedianDays: slow.medianDays,
      ratio: Number.POSITIVE_INFINITY,
      fastRuns: fast.runs,
      slowRuns: slow.runs,
    };
  }

  const ratio = slow.medianDays / fast.medianDays;
  if (ratio < MIN_BUCKET_SPEED_RATIO) return { kind: 'silent' };

  return {
    kind: 'cross-code',
    fastBucket: fast.bucket,
    slowBucket: slow.bucket,
    fastMedianDays: fast.medianDays,
    slowMedianDays: slow.medianDays,
    ratio,
    fastRuns: fast.runs,
    slowRuns: slow.runs,
  };
}
