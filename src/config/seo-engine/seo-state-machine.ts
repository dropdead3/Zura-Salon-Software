/**
 * SEO Task State Machine.
 *
 * All state transitions are rule-based and auditable.
 * No transition may occur outside this map.
 */

export type SEOTaskStatus =
  | 'detected'
  | 'queued'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_dependency'
  | 'awaiting_verification'
  | 'completed'
  | 'overdue'
  | 'escalated'
  | 'suppressed'
  | 'canceled';

export type SEOCampaignStatus =
  | 'planning'
  | 'active'
  | 'blocked'
  | 'at_risk'
  | 'completed'
  | 'abandoned';

/**
 * Valid task state transitions.
 * Key = current status, value = array of allowed next statuses.
 */
export const TASK_STATE_TRANSITIONS: Record<SEOTaskStatus, SEOTaskStatus[]> = {
  detected: ['queued', 'suppressed', 'canceled'],
  queued: ['assigned', 'suppressed', 'canceled'],
  assigned: ['in_progress', 'awaiting_dependency', 'overdue', 'canceled'],
  in_progress: ['awaiting_verification', 'awaiting_dependency', 'completed', 'overdue', 'canceled'],
  awaiting_dependency: ['assigned', 'in_progress', 'overdue', 'canceled'],
  awaiting_verification: ['completed', 'in_progress', 'overdue', 'canceled'],
  completed: [], // terminal
  overdue: ['in_progress', 'escalated', 'canceled'],
  escalated: ['in_progress', 'canceled'],
  suppressed: ['detected', 'canceled'], // can be un-suppressed back to detected
  canceled: [], // terminal
};

/**
 * Valid campaign state transitions.
 */
export const CAMPAIGN_STATE_TRANSITIONS: Record<SEOCampaignStatus, SEOCampaignStatus[]> = {
  planning: ['active', 'abandoned'],
  active: ['blocked', 'at_risk', 'completed', 'abandoned'],
  blocked: ['active', 'at_risk', 'abandoned'],
  at_risk: ['active', 'blocked', 'completed', 'abandoned'],
  completed: [], // terminal
  abandoned: [], // terminal
};

/**
 * Check if a task transition is valid.
 */
export function isValidTaskTransition(
  from: SEOTaskStatus,
  to: SEOTaskStatus,
): boolean {
  return TASK_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a campaign transition is valid.
 */
export function isValidCampaignTransition(
  from: SEOCampaignStatus,
  to: SEOCampaignStatus,
): boolean {
  return CAMPAIGN_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Terminal states (no further transitions allowed).
 */
export const TERMINAL_TASK_STATES: SEOTaskStatus[] = ['completed', 'canceled'];
export const TERMINAL_CAMPAIGN_STATES: SEOCampaignStatus[] = ['completed', 'abandoned'];

/**
 * Active states (tasks that count toward user workload).
 */
export const ACTIVE_TASK_STATES: SEOTaskStatus[] = [
  'assigned',
  'in_progress',
  'awaiting_dependency',
  'awaiting_verification',
];

/**
 * Escalation config.
 */
export interface EscalationRule {
  /** Days overdue before escalation level increases */
  daysOverdueThreshold: number;
  /** Max escalation level */
  maxLevel: number;
}

export const DEFAULT_ESCALATION_RULES: EscalationRule = {
  daysOverdueThreshold: 3,
  maxLevel: 3,
};

/**
 * Status display config for UI.
 */
export const TASK_STATUS_CONFIG: Record<SEOTaskStatus, { label: string; variant: string }> = {
  detected: { label: 'Detected', variant: 'outline' },
  queued: { label: 'Queued', variant: 'secondary' },
  assigned: { label: 'Assigned', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'default' },
  awaiting_dependency: { label: 'Blocked', variant: 'warning' },
  awaiting_verification: { label: 'Verifying', variant: 'default' },
  completed: { label: 'Complete', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  escalated: { label: 'Escalated', variant: 'destructive' },
  suppressed: { label: 'Suppressed', variant: 'muted' },
  canceled: { label: 'Canceled', variant: 'muted' },
};

export const CAMPAIGN_STATUS_CONFIG: Record<SEOCampaignStatus, { label: string; variant: string }> = {
  planning: { label: 'Planning', variant: 'outline' },
  active: { label: 'Active', variant: 'default' },
  blocked: { label: 'Blocked', variant: 'warning' },
  at_risk: { label: 'At Risk', variant: 'destructive' },
  completed: { label: 'Complete', variant: 'success' },
  abandoned: { label: 'Abandoned', variant: 'muted' },
};
