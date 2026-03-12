/**
 * OperationalTaskService — Owns operational_tasks + operational_task_history writes.
 *
 * Creates, assigns, transitions, resolves, and escalates operational tasks.
 * Every mutation records a history entry for full audit trail.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'assigned' | 'in_progress' | 'blocked' | 'resolved' | 'dismissed' | 'expired';
export type ResolutionAction = 'completed' | 'dismissed' | 'expired';

export interface CreateOperationalTaskParams {
  organization_id: string;
  location_id?: string | null;
  title: string;
  description?: string | null;
  task_type: string;
  priority?: TaskPriority;
  assigned_to?: string | null;
  assigned_role?: string | null;
  due_at?: string | null;
  source_type: string;
  source_id?: string | null;
  source_rule?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  created_by?: string | null;
}

export interface OperationalTask {
  id: string;
  organization_id: string;
  location_id: string | null;
  title: string;
  description: string | null;
  task_type: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  assigned_role: string | null;
  assigned_at: string | null;
  due_at: string | null;
  escalated_at: string | null;
  escalation_level: number;
  source_type: string;
  source_id: string | null;
  source_rule: string | null;
  reference_type: string | null;
  reference_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  resolution_action: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Valid state transitions ─────────────────────────

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ['assigned', 'in_progress', 'resolved', 'dismissed', 'expired'],
  assigned: ['in_progress', 'blocked', 'resolved', 'dismissed', 'expired'],
  in_progress: ['blocked', 'resolved', 'dismissed'],
  blocked: ['in_progress', 'resolved', 'dismissed'],
  resolved: [],
  dismissed: [],
  expired: [],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Helpers ─────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function recordHistory(params: {
  task_id: string;
  action: string;
  previous_status?: string | null;
  new_status?: string | null;
  previous_assigned_to?: string | null;
  new_assigned_to?: string | null;
  notes?: string | null;
}): Promise<void> {
  const performedBy = await getCurrentUserId();
  await supabase.from('operational_task_history' as any).insert({
    task_id: params.task_id,
    action: params.action,
    previous_status: params.previous_status ?? null,
    new_status: params.new_status ?? null,
    previous_assigned_to: params.previous_assigned_to ?? null,
    new_assigned_to: params.new_assigned_to ?? null,
    performed_by: performedBy,
    notes: params.notes ?? null,
  } as any);
}

// ─── Service Functions ───────────────────────────────

/**
 * Create an operational task. Deduplicates by source_type + source_id
 * (won't create if an active task already exists for the same source).
 */
export async function createOperationalTask(
  params: CreateOperationalTaskParams
): Promise<OperationalTask> {
  // Dedup: check for existing active task with same source
  if (params.source_id) {
    const { data: existing } = await supabase
      .from('operational_tasks' as any)
      .select('id')
      .eq('organization_id', params.organization_id)
      .eq('source_type', params.source_type)
      .eq('source_id', params.source_id)
      .in('status', ['open', 'assigned', 'in_progress', 'blocked'])
      .limit(1);

    if (existing && existing.length > 0) {
      // Return existing task instead of creating duplicate
      const { data } = await supabase
        .from('operational_tasks' as any)
        .select('*')
        .eq('id', (existing[0] as any).id)
        .single();
      return data as unknown as OperationalTask;
    }
  }

  const userId = params.created_by ?? (await getCurrentUserId());

  const row = {
    organization_id: params.organization_id,
    location_id: params.location_id ?? null,
    title: params.title,
    description: params.description ?? null,
    task_type: params.task_type,
    priority: params.priority ?? 'normal',
    status: params.assigned_to ? 'assigned' : 'open',
    assigned_to: params.assigned_to ?? null,
    assigned_role: params.assigned_role ?? null,
    assigned_at: params.assigned_to ? new Date().toISOString() : null,
    due_at: params.due_at ?? null,
    source_type: params.source_type,
    source_id: params.source_id ?? null,
    source_rule: params.source_rule ?? null,
    reference_type: params.reference_type ?? null,
    reference_id: params.reference_id ?? null,
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('operational_tasks' as any)
    .insert(row as any)
    .select('*')
    .single();

  if (error) throw error;
  const task = data as unknown as OperationalTask;

  await recordHistory({
    task_id: task.id,
    action: 'created',
    new_status: task.status,
    new_assigned_to: task.assigned_to,
    notes: `Task created: ${task.title}`,
  });

  return task;
}

/**
 * Assign a task to a specific user.
 */
export async function assignTask(taskId: string, userId: string): Promise<void> {
  const { data: current } = await supabase
    .from('operational_tasks' as any)
    .select('status, assigned_to')
    .eq('id', taskId)
    .single();

  if (!current) throw new Error('Task not found');
  const prev = current as any;

  const newStatus: TaskStatus = prev.status === 'open' ? 'assigned' : prev.status;

  const { error } = await supabase
    .from('operational_tasks' as any)
    .update({
      assigned_to: userId,
      assigned_at: new Date().toISOString(),
      status: newStatus,
    } as any)
    .eq('id', taskId);

  if (error) throw error;

  await recordHistory({
    task_id: taskId,
    action: 'assigned',
    previous_status: prev.status,
    new_status: newStatus,
    previous_assigned_to: prev.assigned_to,
    new_assigned_to: userId,
  });
}

/**
 * Transition task status with validation.
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  notes?: string
): Promise<void> {
  const { data: current } = await supabase
    .from('operational_tasks' as any)
    .select('status')
    .eq('id', taskId)
    .single();

  if (!current) throw new Error('Task not found');
  const currentStatus = (current as any).status as TaskStatus;

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
  }

  const { error } = await supabase
    .from('operational_tasks' as any)
    .update({ status: newStatus } as any)
    .eq('id', taskId);

  if (error) throw error;

  await recordHistory({
    task_id: taskId,
    action: 'status_changed',
    previous_status: currentStatus,
    new_status: newStatus,
    notes,
  });
}

/**
 * Resolve or dismiss a task.
 */
export async function resolveTask(
  taskId: string,
  action: ResolutionAction,
  notes?: string
): Promise<void> {
  const userId = await getCurrentUserId();

  const { data: current } = await supabase
    .from('operational_tasks' as any)
    .select('status')
    .eq('id', taskId)
    .single();

  if (!current) throw new Error('Task not found');
  const currentStatus = (current as any).status as TaskStatus;

  const targetStatus: TaskStatus = action === 'dismissed' ? 'dismissed' : action === 'expired' ? 'expired' : 'resolved';

  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new Error(`Cannot ${action} task in ${currentStatus} state`);
  }

  const { error } = await supabase
    .from('operational_tasks' as any)
    .update({
      status: targetStatus,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes ?? null,
      resolution_action: action,
    } as any)
    .eq('id', taskId);

  if (error) throw error;

  await recordHistory({
    task_id: taskId,
    action: 'resolved',
    previous_status: currentStatus,
    new_status: targetStatus,
    notes: notes ?? `Task ${action}`,
  });
}

/**
 * Escalate a task: bump escalation_level, optionally reassign, increase priority.
 */
export async function escalateTask(
  taskId: string,
  newAssignedTo?: string | null
): Promise<void> {
  const { data: current } = await supabase
    .from('operational_tasks' as any)
    .select('status, escalation_level, priority, assigned_to')
    .eq('id', taskId)
    .single();

  if (!current) throw new Error('Task not found');
  const prev = current as any;

  const nextLevel = (prev.escalation_level ?? 0) + 1;
  const priorityEscalation: Record<string, TaskPriority> = {
    low: 'normal',
    normal: 'high',
    high: 'urgent',
    urgent: 'urgent',
  };
  const newPriority = priorityEscalation[prev.priority] ?? 'urgent';

  const updates: Record<string, unknown> = {
    escalation_level: nextLevel,
    escalated_at: new Date().toISOString(),
    priority: newPriority,
  };

  if (newAssignedTo) {
    updates.assigned_to = newAssignedTo;
    updates.assigned_at = new Date().toISOString();
  }

  // Auto-expire at level 3
  if (nextLevel >= 3) {
    updates.status = 'expired';
    updates.resolution_action = 'expired';
    updates.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('operational_tasks' as any)
    .update(updates as any)
    .eq('id', taskId);

  if (error) throw error;

  await recordHistory({
    task_id: taskId,
    action: 'escalated',
    previous_status: prev.status,
    new_status: nextLevel >= 3 ? 'expired' : prev.status,
    previous_assigned_to: prev.assigned_to,
    new_assigned_to: newAssignedTo ?? prev.assigned_to,
    notes: `Escalated to level ${nextLevel}. Priority: ${prev.priority} → ${newPriority}`,
  });
}
