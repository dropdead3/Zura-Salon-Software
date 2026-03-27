/**
 * Task Command Validators — Pure functions.
 *
 * Receive pre-fetched state, return ValidationError[].
 * No DB calls.
 */

import type { ValidationError } from './types';
import { isValidTransition, type TaskStatus } from '@/lib/backroom/services/operational-task-service';

// ─── Assign Task ─────────────────────────────────────

export function validateAssignTask(
  task: { status: string } | null,
  userId: string | null
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!task) {
    errors.push({ code: 'TASK_NOT_FOUND', message: 'Task not found' });
    return errors;
  }

  if (!userId) {
    errors.push({ code: 'MISSING_ASSIGNEE', field: 'user_id', message: 'User ID is required for assignment' });
  }

  const terminal: TaskStatus[] = ['resolved', 'dismissed', 'expired'];
  if (terminal.includes(task.status as TaskStatus)) {
    errors.push({ code: 'TASK_CLOSED', message: `Cannot assign a task in ${task.status} state` });
  }

  return errors;
}

// ─── Update Status ───────────────────────────────────

export function validateUpdateStatus(
  task: { status: string } | null,
  newStatus: TaskStatus
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!task) {
    errors.push({ code: 'TASK_NOT_FOUND', message: 'Task not found' });
    return errors;
  }

  if (!isValidTransition(task.status as TaskStatus, newStatus)) {
    errors.push({
      code: 'INVALID_STATE_TRANSITION',
      message: `Cannot transition from ${task.status} to ${newStatus}`,
    });
  }

  return errors;
}

// ─── Resolve Task ────────────────────────────────────

export function validateResolveTask(
  task: { status: string } | null,
  action: string,
  notes?: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!task) {
    errors.push({ code: 'TASK_NOT_FOUND', message: 'Task not found' });
    return errors;
  }

  const validActions = ['completed', 'dismissed', 'expired'];
  if (!validActions.includes(action)) {
    errors.push({ code: 'INVALID_ACTION', field: 'action', message: `Invalid resolution action: ${action}` });
  }

  const terminal: TaskStatus[] = ['resolved', 'dismissed', 'expired'];
  if (terminal.includes(task.status as TaskStatus)) {
    errors.push({ code: 'TASK_ALREADY_CLOSED', message: `Task is already ${task.status}` });
  }

  // Dismissal requires notes
  if (action === 'dismissed' && (!notes || notes.trim().length === 0)) {
    errors.push({ code: 'MISSING_NOTES', field: 'notes', message: 'Dismissal requires a reason' });
  }

  return errors;
}

// ─── Escalate Task ───────────────────────────────────

export function validateEscalateTask(
  task: { status: string; escalation_level: number } | null
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!task) {
    errors.push({ code: 'TASK_NOT_FOUND', message: 'Task not found' });
    return errors;
  }

  const terminal: TaskStatus[] = ['resolved', 'dismissed', 'expired'];
  if (terminal.includes(task.status as TaskStatus)) {
    errors.push({ code: 'TASK_CLOSED', message: `Cannot escalate a task in ${task.status} state` });
  }

  if (task.escalation_level >= 3) {
    errors.push({ code: 'MAX_ESCALATION', message: 'Task has reached maximum escalation level' });
  }

  return errors;
}
