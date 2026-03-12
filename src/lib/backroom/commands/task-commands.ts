/**
 * Task Commands — Command handlers for operational task mutations.
 *
 * Each handler: fetch state → validate (pure) → delegate to OperationalTaskService → audit.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CommandMeta, CommandResult, ValidationError } from './types';
import { logCommandAudit, rejected, succeeded } from './types';
import {
  assignTask,
  updateTaskStatus,
  resolveTask,
  escalateTask,
  type TaskStatus,
  type ResolutionAction,
} from '@/lib/backroom/services/operational-task-service';
import {
  validateAssignTask,
  validateUpdateStatus,
  validateResolveTask,
  validateEscalateTask,
} from './task-validators';

// ─── Helpers ─────────────────────────────────────────

async function fetchTask(taskId: string) {
  const { data } = await supabase
    .from('operational_tasks' as any)
    .select('id, organization_id, status, assigned_to, escalation_level')
    .eq('id', taskId)
    .single();
  return data as unknown as { id: string; organization_id: string; status: string; assigned_to: string | null; escalation_level: number } | null;
}

async function auditAndReject(
  orgId: string,
  commandName: string,
  payload: Record<string, unknown>,
  meta: CommandMeta,
  errors: ValidationError[]
): Promise<CommandResult> {
  await logCommandAudit({
    organization_id: orgId,
    command_name: commandName,
    command_payload: payload,
    meta,
    outcome: 'rejected',
    validation_errors: errors,
  });
  return rejected(meta.idempotency_key, errors);
}

// ─── AssignOperationalTask ───────────────────────────

export interface AssignOperationalTaskCommand {
  task_id: string;
  user_id: string;
  organization_id: string;
  meta: CommandMeta;
}

export async function executeAssignOperationalTask(
  cmd: AssignOperationalTaskCommand
): Promise<CommandResult> {
  const task = await fetchTask(cmd.task_id);
  const errors = validateAssignTask(task, cmd.user_id);

  if (errors.length > 0) {
    return auditAndReject(cmd.organization_id, 'AssignOperationalTask', cmd as any, cmd.meta, errors);
  }

  await assignTask(cmd.task_id, cmd.user_id);

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'AssignOperationalTask',
    command_payload: cmd as any,
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'operational_task',
    result_entity_id: cmd.task_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}

// ─── UpdateOperationalTaskStatus ─────────────────────

export interface UpdateOperationalTaskStatusCommand {
  task_id: string;
  new_status: TaskStatus;
  notes?: string;
  organization_id: string;
  meta: CommandMeta;
}

export async function executeUpdateOperationalTaskStatus(
  cmd: UpdateOperationalTaskStatusCommand
): Promise<CommandResult> {
  const task = await fetchTask(cmd.task_id);
  const errors = validateUpdateStatus(task, cmd.new_status);

  if (errors.length > 0) {
    return auditAndReject(cmd.organization_id, 'UpdateOperationalTaskStatus', cmd as any, cmd.meta, errors);
  }

  await updateTaskStatus(cmd.task_id, cmd.new_status, cmd.notes);

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'UpdateOperationalTaskStatus',
    command_payload: cmd as any,
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'operational_task',
    result_entity_id: cmd.task_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}

// ─── ResolveOperationalTask ──────────────────────────

export interface ResolveOperationalTaskCommand {
  task_id: string;
  action: ResolutionAction;
  notes?: string;
  organization_id: string;
  meta: CommandMeta;
}

export async function executeResolveOperationalTask(
  cmd: ResolveOperationalTaskCommand
): Promise<CommandResult> {
  const task = await fetchTask(cmd.task_id);
  const errors = validateResolveTask(task, cmd.action, cmd.notes);

  if (errors.length > 0) {
    return auditAndReject(cmd.organization_id, 'ResolveOperationalTask', cmd as any, cmd.meta, errors);
  }

  await resolveTask(cmd.task_id, cmd.action, cmd.notes);

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'ResolveOperationalTask',
    command_payload: cmd as any,
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'operational_task',
    result_entity_id: cmd.task_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}

// ─── EscalateOperationalTask ─────────────────────────

export interface EscalateOperationalTaskCommand {
  task_id: string;
  new_assigned_to?: string | null;
  organization_id: string;
  meta: CommandMeta;
}

export async function executeEscalateOperationalTask(
  cmd: EscalateOperationalTaskCommand
): Promise<CommandResult> {
  const task = await fetchTask(cmd.task_id);
  const errors = validateEscalateTask(task);

  if (errors.length > 0) {
    return auditAndReject(cmd.organization_id, 'EscalateOperationalTask', cmd as any, cmd.meta, errors);
  }

  await escalateTask(cmd.task_id, cmd.new_assigned_to);

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'EscalateOperationalTask',
    command_payload: cmd as any,
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'operational_task',
    result_entity_id: cmd.task_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}
