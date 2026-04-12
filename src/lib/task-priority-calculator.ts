/**
 * Task Priority Calculator — Pure deterministic function.
 * Inputs → 0–100 priority score.
 *
 * Formula:
 *   priority_score = (
 *     revenue_impact × 0.40 +
 *     urgency        × 0.25 +
 *     ease           × 0.15 +
 *     confidence     × 0.10 +
 *     dependency     × 0.10
 *   ) × 100
 */

import { differenceInCalendarDays } from 'date-fns';

export interface TaskPriorityInput {
  /** Monthly revenue impact in cents (0 → score 0, 500_000 → score 100) */
  revenueImpactCents: number;
  /** Expiry or due date — used for urgency calc */
  expiresOrDueDate: Date | null;
  /** Execution time estimate in minutes */
  executionTimeMinutes: number | null;
  /** Confidence score from linked opportunity (0–1), default 0.7 */
  confidence?: number;
  /** Whether this task blocks other tasks (future; default false) */
  isBlocking?: boolean;
}

export interface TaskPriorityFactors {
  revenueImpact: number;
  urgency: number;
  ease: number;
  confidence: number;
  dependency: number;
}

export const TASK_PRIORITY_WEIGHTS = {
  revenueImpact: 0.40,
  urgency: 0.25,
  ease: 0.15,
  confidence: 0.10,
  dependency: 0.10,
} as const;

/**
 * Normalize revenue impact: $0 → 0, $5000/mo (500_000 cents) → 1
 */
function normalizeRevenue(cents: number): number {
  return Math.max(0, Math.min(1, cents / 500_000));
}

/**
 * Normalize urgency based on days until expiry/due:
 * 1d → 1.0, 3d → 0.8, 7d → 0.5, 14+ → 0.2, no date → 0.3
 */
function normalizeUrgency(expiresOrDueDate: Date | null): number {
  if (!expiresOrDueDate) return 0.3;
  const daysLeft = differenceInCalendarDays(expiresOrDueDate, new Date());
  if (daysLeft <= 0) return 1.0; // overdue or today
  if (daysLeft <= 1) return 1.0;
  if (daysLeft <= 3) return 0.8;
  if (daysLeft <= 7) return 0.5;
  if (daysLeft <= 14) return 0.3;
  return 0.2;
}

/**
 * Normalize ease based on execution time:
 * 5min → 1.0, 15min → 0.8, 30min → 0.6, 60+ → 0.4, null → 0.5
 */
function normalizeEase(minutes: number | null): number {
  if (minutes == null) return 0.5;
  if (minutes <= 5) return 1.0;
  if (minutes <= 15) return 0.8;
  if (minutes <= 30) return 0.6;
  return 0.4;
}

/**
 * Compute deterministic task priority score.
 * Returns integer 0–100.
 */
export function calculateTaskPriority(input: TaskPriorityInput): {
  score: number;
  factors: TaskPriorityFactors;
} {
  const factors: TaskPriorityFactors = {
    revenueImpact: normalizeRevenue(input.revenueImpactCents),
    urgency: normalizeUrgency(input.expiresOrDueDate),
    ease: normalizeEase(input.executionTimeMinutes),
    confidence: Math.max(0, Math.min(1, input.confidence ?? 0.7)),
    dependency: input.isBlocking ? 1.0 : 0.0,
  };

  const raw =
    factors.revenueImpact * TASK_PRIORITY_WEIGHTS.revenueImpact +
    factors.urgency * TASK_PRIORITY_WEIGHTS.urgency +
    factors.ease * TASK_PRIORITY_WEIGHTS.ease +
    factors.confidence * TASK_PRIORITY_WEIGHTS.confidence +
    factors.dependency * TASK_PRIORITY_WEIGHTS.dependency;

  const score = Math.max(0, Math.min(100, Math.round(raw * 100)));

  return { score, factors };
}

/**
 * Priority tier labels for display.
 */
export function getTaskPriorityTier(score: number): {
  label: string;
  color: string;
} {
  if (score >= 80) return { label: 'Critical', color: 'destructive' };
  if (score >= 60) return { label: 'High', color: 'warning' };
  if (score >= 40) return { label: 'Medium', color: 'default' };
  return { label: 'Low', color: 'secondary' };
}
