/**
 * TaskRuleEngine — Maps exceptions and operational conditions to task creation.
 *
 * Pure mapping logic. Does not write to DB — returns CreateOperationalTaskParams
 * for OperationalTaskService to persist.
 *
 * Auto-generates tasks when:
 * - Exception severity is 'warning' or 'critical'
 * - Exception type is in the task-generating set
 */

import type { CreateOperationalTaskParams, TaskPriority } from './operational-task-service';

// ─── Exception → Task Rule Map ──────────────────────

interface TaskRule {
  task_type: string;
  title_template: string;
  priority: TaskPriority;
  assigned_role: string;
  due_hours: number;
  description_template?: string;
}

const EXCEPTION_TASK_RULES: Record<string, TaskRule> = {
  missing_reweigh: {
    task_type: 'missing_reweigh_review',
    title_template: 'Review missing reweigh',
    priority: 'high',
    assigned_role: 'manager',
    due_hours: 24,
    description_template: 'A mix session was completed without a reweigh. Review and resolve.',
  },
  manual_override_used: {
    task_type: 'manual_override_review',
    title_template: 'Review manual override',
    priority: 'normal',
    assigned_role: 'manager',
    due_hours: 24,
    description_template: 'A manual override was used during a mix session. Verify accuracy.',
  },
  stockout_risk: {
    task_type: 'stockout_reorder',
    title_template: 'Reorder: critical stockout risk',
    priority: 'urgent',
    assigned_role: 'manager',
    due_hours: 24,
    description_template: 'Product is at critical stockout risk. Create or expedite a purchase order.',
  },
  receiving_discrepancy: {
    task_type: 'receiving_review',
    title_template: 'Review receiving discrepancy',
    priority: 'high',
    assigned_role: 'manager',
    due_hours: 24,
    description_template: 'Received quantities differ from PO. Investigate and resolve.',
  },
  ghost_loss: {
    task_type: 'ghost_loss_investigation',
    title_template: 'Investigate ghost loss',
    priority: 'high',
    assigned_role: 'manager',
    due_hours: 48,
    description_template: 'Unexplained inventory loss detected. Investigate root cause.',
  },
  negative_inventory: {
    task_type: 'negative_inventory_resolve',
    title_template: 'Resolve negative inventory',
    priority: 'urgent',
    assigned_role: 'manager',
    due_hours: 12,
    description_template: 'Inventory count is negative. Perform physical count and correct.',
  },
  high_variance: {
    task_type: 'variance_review',
    title_template: 'Review unusual usage variance',
    priority: 'normal',
    assigned_role: 'manager',
    due_hours: 48,
    description_template: 'Usage variance exceeds threshold. Review for accuracy.',
  },
};

// Severities that auto-generate tasks
const TASK_GENERATING_SEVERITIES = new Set(['warning', 'critical']);

// ─── Exception Evaluation ───────────────────────────

export interface ExceptionInput {
  id: string;
  organization_id: string;
  location_id?: string | null;
  exception_type: string;
  severity: string;
  title: string;
  reference_type?: string | null;
  reference_id?: string | null;
  staff_user_id?: string | null;
}

/**
 * Evaluate whether an exception should auto-generate an operational task.
 * Returns task creation params or null if no task should be created.
 */
export function evaluateExceptionForTask(
  exception: ExceptionInput
): CreateOperationalTaskParams | null {
  // Only auto-generate for warning/critical severity
  if (!TASK_GENERATING_SEVERITIES.has(exception.severity)) {
    return null;
  }

  const rule = EXCEPTION_TASK_RULES[exception.exception_type];
  if (!rule) {
    return null;
  }

  const dueAt = new Date();
  dueAt.setHours(dueAt.getHours() + rule.due_hours);

  return {
    organization_id: exception.organization_id,
    location_id: exception.location_id,
    title: rule.title_template,
    description: rule.description_template ?? null,
    task_type: rule.task_type,
    priority: rule.priority,
    assigned_role: rule.assigned_role,
    due_at: dueAt.toISOString(),
    source_type: 'exception',
    source_id: exception.id,
    source_rule: `exception:${exception.exception_type}`,
    reference_type: exception.reference_type,
    reference_id: exception.reference_id ? exception.reference_id : undefined,
  };
}

// ─── Condition-Based Evaluation ─────────────────────

export type ConditionType =
  | 'po_approval_needed'
  | 'charge_override_review'
  | 'receiving_complete';

export interface ConditionContext {
  organization_id: string;
  location_id?: string | null;
  entity_type: string;
  entity_id: string;
  title?: string;
}

const CONDITION_TASK_RULES: Record<ConditionType, TaskRule> = {
  po_approval_needed: {
    task_type: 'po_approval',
    title_template: 'Approve purchase order',
    priority: 'normal',
    assigned_role: 'admin',
    due_hours: 48,
    description_template: 'A purchase order requires approval before it can be sent to the supplier.',
  },
  charge_override_review: {
    task_type: 'charge_override_review',
    title_template: 'Review usage charge override',
    priority: 'high',
    assigned_role: 'manager',
    due_hours: 4,
    description_template: 'A usage charge requires manager review before checkout can proceed.',
  },
  receiving_complete: {
    task_type: 'receiving_review',
    title_template: 'Review completed receiving',
    priority: 'normal',
    assigned_role: 'manager',
    due_hours: 24,
    description_template: 'A shipment has been received. Review for accuracy.',
  },
};

/**
 * Evaluate a non-exception operational condition for task creation.
 */
export function evaluateConditionForTask(
  conditionType: ConditionType,
  context: ConditionContext
): CreateOperationalTaskParams | null {
  const rule = CONDITION_TASK_RULES[conditionType];
  if (!rule) return null;

  const dueAt = new Date();
  dueAt.setHours(dueAt.getHours() + rule.due_hours);

  return {
    organization_id: context.organization_id,
    location_id: context.location_id,
    title: context.title ?? rule.title_template,
    description: rule.description_template ?? null,
    task_type: rule.task_type,
    priority: rule.priority,
    assigned_role: rule.assigned_role,
    due_at: dueAt.toISOString(),
    source_type: conditionType === 'po_approval_needed' ? 'purchasing' : 'billing',
    source_id: context.entity_id,
    source_rule: `condition:${conditionType}`,
    reference_type: context.entity_type,
    reference_id: context.entity_id,
  };
}
