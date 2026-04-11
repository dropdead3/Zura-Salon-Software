/**
 * Campaign Bundle Generator.
 * Generates campaign bundles for competitive gaps, content gaps, or strategic initiatives.
 */

import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';

export type CampaignBundleType = 'competitive_gap' | 'content_gap' | 'review_velocity' | 'local_presence';

export interface CampaignBundleInput {
  type: CampaignBundleType;
  organizationId: string;
  locationId: string;
  locationName: string;
  /** Specific gap signals */
  gapSignals: GapSignal[];
  createdBy: string;
}

export interface GapSignal {
  objectKey: string;
  objectLabel: string;
  objectType: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  competitorValue?: number;
}

export interface GeneratedCampaignBundle {
  title: string;
  objective: string;
  windowDays: number;
  tasks: CampaignBundleTask[];
  expectedMetrics: Record<string, { target: number; unit: string }>;
}

export interface CampaignBundleTask {
  templateKey: string;
  objectKey: string;
  objectLabel: string;
  objectType: string;
  priority: number;
  assignedRole: string;
  dueOffsetDays: number;
}

/**
 * Template mapping per campaign bundle type.
 */
const BUNDLE_TYPE_TEMPLATES: Record<CampaignBundleType, { templateKeys: string[]; windowDays: number; titlePrefix: string }> = {
  competitive_gap: {
    templateKeys: ['competitor_gap_response', 'service_page_update', 'faq_expansion', 'review_request', 'photo_upload'],
    windowDays: 30,
    titlePrefix: 'Competitive Response',
  },
  content_gap: {
    templateKeys: ['service_page_update', 'service_description_rewrite', 'faq_expansion', 'internal_linking', 'before_after_publish'],
    windowDays: 28,
    titlePrefix: 'Content Strengthening',
  },
  review_velocity: {
    templateKeys: ['review_request', 'review_response', 'booking_cta_optimization'],
    windowDays: 21,
    titlePrefix: 'Review Acceleration',
  },
  local_presence: {
    templateKeys: ['gbp_post', 'local_landing_page_creation', 'photo_upload', 'metadata_fix'],
    windowDays: 21,
    titlePrefix: 'Local Visibility',
  },
};

/**
 * Generate a campaign bundle from gap signals.
 */
export function generateCampaignBundle(input: CampaignBundleInput): GeneratedCampaignBundle {
  const bundleDef = BUNDLE_TYPE_TEMPLATES[input.type];
  const tasks: CampaignBundleTask[] = [];

  const roleByType: Record<string, string> = {
    review: 'front_desk',
    content: 'marketing_admin',
    page: 'marketing_admin',
    local_presence: 'marketing_admin',
    strategy: 'manager',
    conversion: 'marketing_admin',
  };

  let priorityBase = 85;

  for (const signal of input.gapSignals) {
    for (const templateKey of bundleDef.templateKeys) {
      const template = SEO_TASK_TEMPLATES[templateKey];
      if (!template) continue;

      tasks.push({
        templateKey,
        objectKey: signal.objectKey,
        objectLabel: signal.objectLabel,
        objectType: signal.objectType,
        priority: Math.max(priorityBase, 30),
        assignedRole: roleByType[template.taskType] ?? 'manager',
        dueOffsetDays: template.defaultDueDays,
      });

      priorityBase -= 3;
    }
  }

  const expectedMetrics: Record<string, { target: number; unit: string }> = {};
  if (input.type === 'competitive_gap') {
    expectedMetrics['gap_reduction'] = { target: 30, unit: '%' };
  } else if (input.type === 'review_velocity') {
    expectedMetrics['review_increase'] = { target: 50, unit: '%' };
  } else if (input.type === 'content_gap') {
    expectedMetrics['content_coverage'] = { target: 90, unit: '%' };
  } else if (input.type === 'local_presence') {
    expectedMetrics['local_score_lift'] = { target: 20, unit: 'pts' };
  }

  return {
    title: `${bundleDef.titlePrefix}: ${input.locationName}`,
    objective: `Address ${input.gapSignals.length} gap${input.gapSignals.length !== 1 ? 's' : ''} at ${input.locationName} to improve ${input.type.replace(/_/g, ' ')} metrics.`,
    windowDays: bundleDef.windowDays,
    tasks,
    expectedMetrics,
  };
}
