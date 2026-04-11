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

  // 3. Update task
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

  // 4. Record history
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
