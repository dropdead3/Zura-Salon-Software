/**
 * SEO Task Service.
 * CRUD, state transitions, and validation for seo_tasks.
 * All mutations go through this service to ensure state machine compliance.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  isValidTaskTransition,
  isValidCampaignTransition,
  type SEOTaskStatus,
  type SEOCampaignStatus,
} from '@/config/seo-engine/seo-state-machine';
import { checkDependencies, type DependencyInfo } from '@/lib/seo-engine/seo-dependency-resolver';

// ---------------------------------------------------------------------------
// Task State Transition
// ---------------------------------------------------------------------------

export interface TransitionParams {
  taskId: string;
  newStatus: SEOTaskStatus;
  performedBy: string;
  notes?: string;
}

/**
 * Transition a task to a new status. Validates against state machine.
 * GAP 3: Checks hard dependencies before allowing transition to in_progress.
 * Records history entry for audit trail.
 */
export async function transitionTaskStatus({
  taskId,
  newStatus,
  performedBy,
  notes,
}: TransitionParams): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch current status
  const { data: task, error: fetchErr } = await supabase
    .from('seo_tasks' as any)
    .select('status')
    .eq('id', taskId)
    .single();

  if (fetchErr || !task) {
    return { success: false, error: fetchErr?.message ?? 'Task not found.' };
  }

  const currentStatus = (task as any).status as SEOTaskStatus;

  // 2. Validate transition
  if (!isValidTaskTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid transition: ${currentStatus} → ${newStatus}.`,
    };
  }

  // 3. GAP 3: Check dependencies before allowing in_progress
  if (newStatus === 'in_progress') {
    const depCheck = await checkTaskDependencies(taskId);
    if (!depCheck.canProceed) {
      const blockers = depCheck.blockedBy.map(d => d.dependsOnTaskId).join(', ');
      return {
        success: false,
        error: `Blocked by unfinished dependencies: ${blockers}. Complete them first.`,
      };
    }
  }

  // 4. Update task
  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'completed') {
    updates.resolved_at = new Date().toISOString();
    updates.resolved_by = performedBy;
  }

  const { error: updateErr } = await supabase
    .from('seo_tasks' as any)
    .update(updates)
    .eq('id', taskId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // 5. Record history
  await supabase.from('seo_task_history' as any).insert({
    task_id: taskId,
    action: `status_change`,
    previous_status: currentStatus,
    new_status: newStatus,
    performed_by: performedBy,
    notes: notes ?? null,
  });

  return { success: true };
}

/**
 * GAP 3: Check dependencies for a task before transition.
 */
async function checkTaskDependencies(taskId: string) {
  const { data: deps } = await supabase
    .from('seo_task_dependencies' as any)
    .select('id, task_id, depends_on_task_id, dependency_type')
    .eq('task_id', taskId);

  if (!deps?.length) {
    return { canProceed: true, blockedBy: [] as DependencyInfo[], softWarnings: [] as DependencyInfo[] };
  }

  // Fetch statuses of depended-on tasks
  const depTaskIds = (deps as any[]).map((d: any) => d.depends_on_task_id);
  const { data: depTasks } = await supabase
    .from('seo_tasks' as any)
    .select('id, status')
    .in('id', depTaskIds);

  const statusMap = new Map((depTasks as any[] || []).map((t: any) => [t.id, t.status]));

  const dependencyInfos: DependencyInfo[] = (deps as any[]).map((d: any) => ({
    taskId: d.task_id,
    dependsOnTaskId: d.depends_on_task_id,
    dependencyType: d.dependency_type || 'hard',
    dependsOnStatus: statusMap.get(d.depends_on_task_id) || 'detected',
  }));

  return checkDependencies(dependencyInfos);
}

// ---------------------------------------------------------------------------
// Campaign State Transition
// ---------------------------------------------------------------------------

export async function transitionCampaignStatus({
  campaignId,
  newStatus,
}: {
  campaignId: string;
  newStatus: SEOCampaignStatus;
}): Promise<{ success: boolean; error?: string }> {
  const { data: campaign, error: fetchErr } = await supabase
    .from('seo_campaigns' as any)
    .select('status')
    .eq('id', campaignId)
    .single();

  if (fetchErr || !campaign) {
    return { success: false, error: fetchErr?.message ?? 'Campaign not found.' };
  }

  const currentStatus = (campaign as any).status as SEOCampaignStatus;

  if (!isValidCampaignTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid campaign transition: ${currentStatus} → ${newStatus}.`,
    };
  }

  const { error: updateErr } = await supabase
    .from('seo_campaigns' as any)
    .update({ status: newStatus })
    .eq('id', campaignId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Due date calculation
// ---------------------------------------------------------------------------

import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';

/**
 * Deterministic due date from template defaults.
 */
export function calculateDueDate(templateKey: string, createdAt?: Date): Date {
  const template = SEO_TASK_TEMPLATES[templateKey];
  const base = createdAt ?? new Date();
  const dueDays = template?.defaultDueDays ?? 7;
  const due = new Date(base);
  due.setDate(due.getDate() + dueDays);
  return due;
}

/**
 * Deterministic cooldown-until date from template defaults.
 */
export function calculateCooldownUntil(templateKey: string, completedAt?: Date): Date {
  const template = SEO_TASK_TEMPLATES[templateKey];
  const base = completedAt ?? new Date();
  const cooldownDays = template?.cooldownDays ?? 30;
  const until = new Date(base);
  until.setDate(until.getDate() + cooldownDays);
  return until;
}
