/**
 * SEO Suppression Engine.
 * Deterministic checks for duplicate, cooldown, cap, and data suppression.
 */

import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { ACTIVE_TASK_STATES } from '@/config/seo-engine/seo-state-machine';
import { DEFAULT_USER_TASK_CAP, MIN_BUSINESS_VALUE_THRESHOLD } from '@/config/seo-engine/seo-quotas';

export interface ExistingTaskInfo {
  templateKey: string;
  primarySeoObjectId: string;
  status: string;
  cooldownUntil: string | null;
  assignedTo: string | null;
}

export interface SuppressionContext {
  templateKey: string;
  primarySeoObjectId: string;
  existingTasks: ExistingTaskInfo[];
  assigneeActiveTaskCount: number;
  businessValueScore: number;
  hasRequiredSourceData: boolean;
  now?: Date;
}

export interface SuppressionResult {
  suppressed: boolean;
  reason: string | null;
}

/**
 * Check all suppression rules. Returns first matching reason or null.
 */
export function checkSuppression(ctx: SuppressionContext): SuppressionResult {
  const template = SEO_TASK_TEMPLATES[ctx.templateKey];
  if (!template) {
    return { suppressed: true, reason: 'Unknown template key.' };
  }

  const now = ctx.now ?? new Date();

  // 1. Duplicate: open task of same template for same object
  const openDuplicate = ctx.existingTasks.find(
    (t) =>
      t.templateKey === ctx.templateKey &&
      t.primarySeoObjectId === ctx.primarySeoObjectId &&
      ACTIVE_TASK_STATES.includes(t.status as any),
  );
  if (openDuplicate) {
    return { suppressed: true, reason: 'Duplicate: open task exists for this object and template.' };
  }

  // 2. Max open per object
  const openCountForObject = ctx.existingTasks.filter(
    (t) =>
      t.templateKey === ctx.templateKey &&
      t.primarySeoObjectId === ctx.primarySeoObjectId &&
      ACTIVE_TASK_STATES.includes(t.status as any),
  ).length;
  if (openCountForObject >= template.maxOpenPerObject) {
    return { suppressed: true, reason: `Max open tasks (${template.maxOpenPerObject}) reached for this object.` };
  }

  // 3. Cooldown: recently completed task for same object
  const recentCompletion = ctx.existingTasks.find(
    (t) =>
      t.templateKey === ctx.templateKey &&
      t.primarySeoObjectId === ctx.primarySeoObjectId &&
      t.cooldownUntil &&
      new Date(t.cooldownUntil) > now,
  );
  if (recentCompletion) {
    return { suppressed: true, reason: 'Cooldown: recently completed task still in cooldown window.' };
  }

  // 4. Business value threshold
  if (ctx.businessValueScore < MIN_BUSINESS_VALUE_THRESHOLD * 100) {
    return { suppressed: true, reason: 'Below business value threshold.' };
  }

  // 5. Missing source data
  if (!ctx.hasRequiredSourceData) {
    return { suppressed: true, reason: 'Required source data is missing.' };
  }

  // 6. User task cap
  if (ctx.assigneeActiveTaskCount >= DEFAULT_USER_TASK_CAP) {
    return { suppressed: true, reason: 'Assignee at SEO task cap.' };
  }

  return { suppressed: false, reason: null };
}
