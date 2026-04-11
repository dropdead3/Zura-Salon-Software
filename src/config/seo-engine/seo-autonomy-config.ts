/**
 * SEO Autonomy Configuration
 *
 * Classifies task templates into autonomy levels and defines rate limit defaults.
 */

export type AutonomyLevel = 'autonomous' | 'assisted' | 'human_only';

/**
 * Maps template keys to their autonomy classification.
 * - autonomous: Zura executes immediately, no human needed
 * - assisted: Zura generates content, human approves before publish
 * - human_only: Zura assigns and enforces, cannot execute
 */
export const TEMPLATE_AUTONOMY_MAP: Record<string, AutonomyLevel> = {
  // Fully Autonomous
  review_request: 'autonomous',
  gbp_post: 'autonomous',
  metadata_fix: 'autonomous',
  internal_linking: 'autonomous',
  faq_expansion: 'autonomous',
  booking_cta_optimization: 'autonomous',
  review_response: 'autonomous',

  // Assisted (generate → preview → approve)
  before_after_publish: 'assisted',
  service_description_rewrite: 'assisted',
  content_refresh: 'assisted',
  local_landing_page_creation: 'assisted',
  service_page_update: 'assisted',

  // Human-Only
  photo_upload: 'human_only',
  stylist_spotlight_publish: 'human_only',
  competitor_gap_response: 'human_only',
  page_completion: 'human_only',
};

export const AUTONOMY_LEVEL_CONFIG: Record<AutonomyLevel, {
  label: string;
  description: string;
  color: string;
}> = {
  autonomous: {
    label: 'Fully Autonomous',
    description: 'Zura executes automatically within rate limits',
    color: 'text-green-600',
  },
  assisted: {
    label: 'Assisted',
    description: 'Zura prepares content, you approve before publish',
    color: 'text-amber-600',
  },
  human_only: {
    label: 'Human Required',
    description: 'Assigned to team members — cannot be automated',
    color: 'text-muted-foreground',
  },
};

/** Default rate limits by template key (daily unless noted) */
export const DEFAULT_RATE_LIMITS: Record<string, { period: 'day' | 'week'; max: number }> = {
  review_request: { period: 'day', max: 5 },
  gbp_post: { period: 'week', max: 2 },
  metadata_fix: { period: 'day', max: 3 },
  internal_linking: { period: 'day', max: 3 },
  faq_expansion: { period: 'day', max: 3 },
  booking_cta_optimization: { period: 'day', max: 2 },
  review_response: { period: 'day', max: 10 },
};

/** Minimum confidence score (0–1) to auto-execute */
export const DEFAULT_MIN_CONFIDENCE = 0.6;

/** Action types for logging */
export const AUTONOMOUS_ACTION_TYPES = {
  AUTO_EXECUTED: 'auto_executed',
  GENERATED_FOR_APPROVAL: 'generated_for_approval',
  ASSIGNED_HUMAN: 'assigned_human',
} as const;

/** Status values for autonomous actions */
export const AUTONOMOUS_ACTION_STATUSES = {
  EXECUTED: 'executed',
  ROLLED_BACK: 'rolled_back',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FAILED: 'failed',
} as const;
