/**
 * SEO Momentum Calculator.
 * Computes a forward-looking directional score per service-location.
 * Combines: task completion velocity, review velocity, content freshness, competitor movement.
 * Output: -100 (losing fast) to +100 (gaining fast), with a directional label.
 */

export type MomentumDirection = 'gaining' | 'holding' | 'losing';

export interface MomentumInput {
  /** Rolling 7d completed task count */
  tasksCompleted7d: number;
  /** Rolling 7d expected task count (from quotas) */
  tasksExpected7d: number;
  /** Review count delta over last 30d vs prior 30d */
  reviewVelocityDelta: number;
  /** Days since last content update on primary page */
  daysSinceContentUpdate: number;
  /** Competitor distance delta (positive = we're closing the gap) */
  competitorDistanceDelta: number;
  /** Object label for display */
  objectLabel: string;
  /** Location label for display */
  locationLabel: string;
}

export interface MomentumResult {
  score: number; // -100 to +100
  direction: MomentumDirection;
  label: string; // e.g. "Gaining in Blonding (Mesa)"
  factors: MomentumFactor[];
}

export interface MomentumFactor {
  name: string;
  contribution: number; // -25 to +25
  detail: string;
}

const WEIGHTS = {
  taskVelocity: 0.30,
  reviewVelocity: 0.30,
  contentFreshness: 0.20,
  competitorGap: 0.20,
} as const;

/**
 * Compute momentum score for a single service-location.
 */
export function computeMomentum(input: MomentumInput): MomentumResult {
  const factors: MomentumFactor[] = [];

  // 1. Task completion velocity: ratio of completed vs expected
  const taskRatio = input.tasksExpected7d > 0
    ? input.tasksCompleted7d / input.tasksExpected7d
    : input.tasksCompleted7d > 0 ? 1 : 0;
  const taskScore = clampFactor((taskRatio - 0.5) * 2); // 0→-1, 0.5→0, 1→+1
  factors.push({
    name: 'Task Velocity',
    contribution: Math.round(taskScore * WEIGHTS.taskVelocity * 100),
    detail: `${input.tasksCompleted7d}/${input.tasksExpected7d} tasks completed (7d)`,
  });

  // 2. Review velocity delta: normalized to -1..+1 range
  const reviewScore = clampFactor(input.reviewVelocityDelta / 10); // ±10 reviews = max score
  factors.push({
    name: 'Review Velocity',
    contribution: Math.round(reviewScore * WEIGHTS.reviewVelocity * 100),
    detail: `${input.reviewVelocityDelta > 0 ? '+' : ''}${input.reviewVelocityDelta} reviews vs prior period`,
  });

  // 3. Content freshness: recent = positive, stale = negative
  const freshnessScore = clampFactor(
    input.daysSinceContentUpdate <= 7 ? 1 :
    input.daysSinceContentUpdate <= 14 ? 0.5 :
    input.daysSinceContentUpdate <= 30 ? 0 :
    input.daysSinceContentUpdate <= 60 ? -0.5 : -1
  );
  factors.push({
    name: 'Content Freshness',
    contribution: Math.round(freshnessScore * WEIGHTS.contentFreshness * 100),
    detail: `Last updated ${input.daysSinceContentUpdate}d ago`,
  });

  // 4. Competitor distance delta: positive = closing gap
  const competitorScore = clampFactor(input.competitorDistanceDelta / 20); // ±20 pts = max
  factors.push({
    name: 'Competitive Position',
    contribution: Math.round(competitorScore * WEIGHTS.competitorGap * 100),
    detail: `Gap ${input.competitorDistanceDelta > 0 ? 'closing' : 'widening'} by ${Math.abs(input.competitorDistanceDelta)} pts`,
  });

  // Weighted total
  const rawScore = (
    taskScore * WEIGHTS.taskVelocity +
    reviewScore * WEIGHTS.reviewVelocity +
    freshnessScore * WEIGHTS.contentFreshness +
    competitorScore * WEIGHTS.competitorGap
  );

  const score = Math.round(rawScore * 100);

  const direction: MomentumDirection =
    score >= 10 ? 'gaining' :
    score <= -10 ? 'losing' : 'holding';

  const directionVerb = direction === 'gaining' ? 'Gaining' : direction === 'losing' ? 'Losing ground' : 'Holding steady';

  return {
    score,
    direction,
    label: `${directionVerb} in ${input.objectLabel} (${input.locationLabel})`,
    factors,
  };
}

function clampFactor(v: number): number {
  return Math.min(1, Math.max(-1, v));
}

/**
 * Direction display config for UI.
 */
export const MOMENTUM_DIRECTION_CONFIG: Record<MomentumDirection, {
  label: string;
  color: string;
  icon: 'trending-up' | 'minus' | 'trending-down';
}> = {
  gaining: { label: 'Gaining', color: 'text-green-500', icon: 'trending-up' },
  holding: { label: 'Holding', color: 'text-muted-foreground', icon: 'minus' },
  losing: { label: 'Losing', color: 'text-destructive', icon: 'trending-down' },
};
