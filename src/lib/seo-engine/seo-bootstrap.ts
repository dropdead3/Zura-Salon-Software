/**
 * New Location Bootstrap — SEO Campaign Generator.
 * Auto-generates the foundational SEO campaign for a new location,
 * including required service pages, metadata, FAQs, proof uploads,
 * GBP setup, first posts, review targets, stylist pages, and internal links.
 */

import { SEO_TASK_TEMPLATES, type SEOTaskTemplateConfig } from '@/config/seo-engine/seo-task-templates';
import { calculateDueDate } from '@/lib/seo-engine/seo-task-service';

export interface BootstrapInput {
  organizationId: string;
  locationId: string;
  locationName: string;
  /** Services offered at this location */
  services: { id: string; name: string; isHighValue?: boolean }[];
  /** Stylists at this location */
  stylists: { id: string; name: string }[];
  /** Who creates the campaign */
  createdBy: string;
}

export interface BootstrapCampaign {
  title: string;
  objective: string;
  windowDays: number;
  tasks: BootstrapTask[];
}

export interface BootstrapTask {
  templateKey: string;
  label: string;
  objectType: string;
  objectKey: string;
  objectLabel: string;
  dueOffsetDays: number;
  priority: number;
  assignedRole: string;
  /** Deps: templateKeys this task should wait for */
  dependsOn: string[];
  aiContentHints: Record<string, string>;
}

/**
 * Bootstrap template sequence with dependency ordering.
 * Tasks are grouped into phases for proper sequencing.
 */
const BOOTSTRAP_PHASES: {
  phase: number;
  label: string;
  templates: {
    templateKey: string;
    scope: 'location' | 'service' | 'stylist';
    assignedRole: string;
    basePriority: number;
    dependsOnTemplates: string[];
  }[];
}[] = [
  {
    phase: 1,
    label: 'Foundation',
    templates: [
      { templateKey: 'local_landing_page_creation', scope: 'location', assignedRole: 'marketing_admin', basePriority: 95, dependsOnTemplates: [] },
      { templateKey: 'metadata_fix', scope: 'location', assignedRole: 'marketing_admin', basePriority: 90, dependsOnTemplates: [] },
    ],
  },
  {
    phase: 2,
    label: 'Service Pages',
    templates: [
      { templateKey: 'service_page_update', scope: 'service', assignedRole: 'marketing_admin', basePriority: 85, dependsOnTemplates: ['local_landing_page_creation'] },
      { templateKey: 'service_description_rewrite', scope: 'service', assignedRole: 'marketing_admin', basePriority: 80, dependsOnTemplates: ['service_page_update'] },
      { templateKey: 'faq_expansion', scope: 'service', assignedRole: 'marketing_admin', basePriority: 75, dependsOnTemplates: ['service_page_update'] },
    ],
  },
  {
    phase: 3,
    label: 'Content & Proof',
    templates: [
      { templateKey: 'photo_upload', scope: 'service', assignedRole: 'stylist', basePriority: 70, dependsOnTemplates: ['service_page_update'] },
      { templateKey: 'before_after_publish', scope: 'service', assignedRole: 'stylist', basePriority: 65, dependsOnTemplates: ['photo_upload'] },
      { templateKey: 'stylist_spotlight_publish', scope: 'stylist', assignedRole: 'marketing_admin', basePriority: 60, dependsOnTemplates: [] },
    ],
  },
  {
    phase: 4,
    label: 'Local Presence',
    templates: [
      { templateKey: 'gbp_post', scope: 'location', assignedRole: 'marketing_admin', basePriority: 55, dependsOnTemplates: ['local_landing_page_creation'] },
      { templateKey: 'internal_linking', scope: 'service', assignedRole: 'marketing_admin', basePriority: 50, dependsOnTemplates: ['service_page_update'] },
    ],
  },
  {
    phase: 5,
    label: 'Engagement',
    templates: [
      { templateKey: 'review_request', scope: 'service', assignedRole: 'front_desk', basePriority: 45, dependsOnTemplates: [] },
      { templateKey: 'booking_cta_optimization', scope: 'service', assignedRole: 'marketing_admin', basePriority: 40, dependsOnTemplates: ['service_page_update'] },
    ],
  },
];

/**
 * Generate a deterministic bootstrap campaign for a new location.
 */
export function generateBootstrapCampaign(input: BootstrapInput): BootstrapCampaign {
  const tasks: BootstrapTask[] = [];
  const phaseOffsetDays = [0, 7, 14, 21, 28];

  for (const phase of BOOTSTRAP_PHASES) {
    const baseOffset = phaseOffsetDays[phase.phase - 1] ?? 0;

    for (const tmplDef of phase.templates) {
      const template = SEO_TASK_TEMPLATES[tmplDef.templateKey];
      if (!template) continue;

      if (tmplDef.scope === 'location') {
        tasks.push(makeTask(template, tmplDef, input.locationId, input.locationName, 'location', baseOffset, input));
      } else if (tmplDef.scope === 'service') {
        for (const svc of input.services) {
          tasks.push(makeTask(template, tmplDef, `${input.locationId}:${svc.id}`, `${svc.name} @ ${input.locationName}`, 'location_service', baseOffset, input));
        }
      } else if (tmplDef.scope === 'stylist') {
        for (const stylist of input.stylists) {
          tasks.push(makeTask(template, tmplDef, `stylist:${stylist.id}`, stylist.name, 'stylist_page', baseOffset, input));
        }
      }
    }
  }

  const totalServices = input.services.length;
  const totalStylists = input.stylists.length;
  const windowDays = 42; // 6 weeks

  return {
    title: `New Location Launch: ${input.locationName}`,
    objective: `Establish foundational SEO presence for ${input.locationName} across ${totalServices} services and ${totalStylists} stylists. Target: all service pages live, GBP optimized, review pipeline active.`,
    windowDays,
    tasks,
  };
}

function makeTask(
  template: SEOTaskTemplateConfig,
  tmplDef: (typeof BOOTSTRAP_PHASES)[number]['templates'][number],
  objectKey: string,
  objectLabel: string,
  objectType: string,
  baseOffset: number,
  input: BootstrapInput,
): BootstrapTask {
  return {
    templateKey: template.templateKey,
    label: template.label,
    objectType,
    objectKey,
    objectLabel,
    dueOffsetDays: baseOffset + template.defaultDueDays,
    priority: tmplDef.basePriority,
    assignedRole: tmplDef.assignedRole,
    dependsOn: tmplDef.dependsOnTemplates,
    aiContentHints: {
      location: input.locationName,
      object: objectLabel,
    },
  };
}

/**
 * Estimate total task count for a bootstrap campaign.
 */
export function estimateBootstrapTaskCount(serviceCount: number, stylistCount: number): number {
  let count = 0;
  for (const phase of BOOTSTRAP_PHASES) {
    for (const t of phase.templates) {
      if (t.scope === 'location') count += 1;
      else if (t.scope === 'service') count += serviceCount;
      else if (t.scope === 'stylist') count += stylistCount;
    }
  }
  return count;
}
