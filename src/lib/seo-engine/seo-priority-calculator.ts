/**
 * SEO Priority Calculator — Pure function.
 * Inputs → deterministic 0–100 score.
 */

import {
  computePriorityScore,
  DEFAULT_PRIORITY_WEIGHTS,
  type PriorityFactors,
  type PriorityWeights,
} from '@/config/seo-engine/seo-priority-model';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';

export interface PriorityInput {
  templateKey: string;
  /** Problem severity from the problem type definition (0–1) */
  problemSeverity: number;
  /** Opportunity score from seo_opportunity_risk_scores (0–100) */
  opportunityScore: number;
  /** Business value of the related service-location (0–100) */
  businessValueScore: number;
  /** Freshness urgency (0–1): higher = more time-sensitive */
  freshnessUrgency: number;
  /** Number of currently active SEO tasks for this user */
  userActiveTaskCount: number;
  /** Max task cap for fatigue calculation */
  userTaskCap?: number;
}

/**
 * Compute deterministic priority score.
 */
export function calculateSEOTaskPriority(input: PriorityInput): {
  score: number;
  factors: PriorityFactors;
} {
  const template = SEO_TASK_TEMPLATES[input.templateKey];
  const taskCap = input.userTaskCap ?? 10;

  // Ease: inverse of complexity. Templates with longer due dates are harder.
  const defaultDueDays = template?.defaultDueDays ?? 7;
  const ease = Math.max(0, Math.min(1, 1 - (defaultDueDays - 1) / 21));

  // Fatigue penalty: ramps up as user approaches cap
  const fatiguePenalty = Math.min(1, input.userActiveTaskCount / taskCap);

  // Build factors, normalizing 0–100 inputs to 0–1
  const factors: PriorityFactors = {
    severity: Math.max(0, Math.min(1, input.problemSeverity)),
    opportunity: Math.max(0, Math.min(1, input.opportunityScore / 100)),
    businessValue: Math.max(0, Math.min(1, input.businessValueScore / 100)),
    ease,
    freshness: Math.max(0, Math.min(1, input.freshnessUrgency)),
    fatiguePenalty,
  };

  // Apply template-specific weight overrides if any
  let weights = DEFAULT_PRIORITY_WEIGHTS;
  if (template?.templateKey) {
    // Templates can override via DB; for now use defaults
    weights = DEFAULT_PRIORITY_WEIGHTS;
  }

  const score = computePriorityScore(factors, weights);

  return { score, factors };
}
