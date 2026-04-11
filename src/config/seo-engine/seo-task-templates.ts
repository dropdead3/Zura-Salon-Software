/**
 * SEO Task Template definitions (client-side mirror of DB seed).
 * Used for rendering, validation, and deterministic logic.
 */

import type { SEOHealthDomain } from './seo-health-domains';

export interface SEOTaskTemplateConfig {
  templateKey: string;
  label: string;
  descriptionTemplate: string;
  taskType: string;
  triggerDomain: SEOHealthDomain | null;
  /** Expected impact category for measuring post-completion effect */
  expectedImpactCategory: string;
  /** Whether the system can auto-verify completion */
  systemVerifiable: boolean;
  /** If not system-verifiable, what proof is required */
  proofRequirements: string[];
  /** Human-readable completion criteria */
  completionDescription: string;
  /** Default due-date offset in days from task creation */
  defaultDueDays: number;
  /** Escalation: days overdue before escalation triggers */
  escalationThresholdDays: number;
  /** Cooldown in days after completion before this template can fire again for the same object */
  cooldownDays: number;
  /** Max open tasks of this template per SEO object */
  maxOpenPerObject: number;
}

export const SEO_TASK_TEMPLATES: Record<string, SEOTaskTemplateConfig> = {
  review_request: {
    templateKey: 'review_request',
    label: 'Review Request',
    descriptionTemplate: 'Request a review from a recent {{service}} client at {{location}}.',
    taskType: 'review',
    triggerDomain: 'review',
    expectedImpactCategory: 'review_velocity',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Review request sent through approved channel and logged.',
    defaultDueDays: 2,
    escalationThresholdDays: 3,
    cooldownDays: 7,
    maxOpenPerObject: 3,
  },
  review_response: {
    templateKey: 'review_response',
    label: 'Review Response',
    descriptionTemplate: 'Respond to a {{rating}}-star review from {{clientName}} at {{location}}.',
    taskType: 'review',
    triggerDomain: 'review',
    expectedImpactCategory: 'review_velocity',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Response posted to the review.',
    defaultDueDays: 1,
    escalationThresholdDays: 2,
    cooldownDays: 0,
    maxOpenPerObject: 5,
  },
  photo_upload: {
    templateKey: 'photo_upload',
    label: 'Photo Upload',
    descriptionTemplate: 'Upload {{count}} tagged photos for {{service}} at {{location}}.',
    taskType: 'content',
    triggerDomain: 'content',
    expectedImpactCategory: 'content_freshness',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Required number of tagged photos uploaded to the correct service/location.',
    defaultDueDays: 7,
    escalationThresholdDays: 5,
    cooldownDays: 30,
    maxOpenPerObject: 1,
  },
  gbp_post: {
    templateKey: 'gbp_post',
    label: 'GBP Post',
    descriptionTemplate: 'Publish a Google Business Profile post for {{location}}.',
    taskType: 'local_presence',
    triggerDomain: 'local_presence',
    expectedImpactCategory: 'local_presence',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Post published to the correct GBP listing.',
    defaultDueDays: 3,
    escalationThresholdDays: 4,
    cooldownDays: 7,
    maxOpenPerObject: 1,
  },
  service_page_update: {
    templateKey: 'service_page_update',
    label: 'Service Page Update',
    descriptionTemplate: 'Update the {{service}} page at {{location}} to improve SEO signals.',
    taskType: 'page',
    triggerDomain: 'page',
    expectedImpactCategory: 'page_health',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Page structural validation passes after update.',
    defaultDueDays: 7,
    escalationThresholdDays: 5,
    cooldownDays: 30,
    maxOpenPerObject: 1,
  },
  page_completion: {
    templateKey: 'page_completion',
    label: 'Page Completion',
    descriptionTemplate: 'Complete the {{pageName}} page with all required sections.',
    taskType: 'page',
    triggerDomain: 'page',
    expectedImpactCategory: 'page_health',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'All required page sections are present and pass validation.',
    defaultDueDays: 14,
    escalationThresholdDays: 7,
    cooldownDays: 60,
    maxOpenPerObject: 1,
  },
  metadata_fix: {
    templateKey: 'metadata_fix',
    label: 'Metadata Fix',
    descriptionTemplate: 'Fix {{field}} on {{pageName}} page.',
    taskType: 'page',
    triggerDomain: 'page',
    expectedImpactCategory: 'page_health',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Metadata fields pass validation rules.',
    defaultDueDays: 5,
    escalationThresholdDays: 3,
    cooldownDays: 30,
    maxOpenPerObject: 1,
  },
  internal_linking: {
    templateKey: 'internal_linking',
    label: 'Internal Linking',
    descriptionTemplate: 'Add internal links to {{pageName}} connecting to related service pages.',
    taskType: 'page',
    triggerDomain: 'page',
    expectedImpactCategory: 'page_health',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Minimum internal link count is met and links are valid.',
    defaultDueDays: 7,
    escalationThresholdDays: 5,
    cooldownDays: 60,
    maxOpenPerObject: 1,
  },
  before_after_publish: {
    templateKey: 'before_after_publish',
    label: 'Before/After Publish',
    descriptionTemplate: 'Publish a before/after transformation for {{service}} at {{location}}.',
    taskType: 'content',
    triggerDomain: 'content',
    expectedImpactCategory: 'content_freshness',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Before/after content is live and linked correctly.',
    defaultDueDays: 14,
    escalationThresholdDays: 7,
    cooldownDays: 30,
    maxOpenPerObject: 2,
  },
  stylist_spotlight_publish: {
    templateKey: 'stylist_spotlight_publish',
    label: 'Stylist Spotlight Publish',
    descriptionTemplate: 'Publish or update the spotlight page for {{stylistName}}.',
    taskType: 'content',
    triggerDomain: 'content',
    expectedImpactCategory: 'content_freshness',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Stylist page is live with bio, photo, and specialties.',
    defaultDueDays: 14,
    escalationThresholdDays: 7,
    cooldownDays: 90,
    maxOpenPerObject: 1,
  },
  faq_expansion: {
    templateKey: 'faq_expansion',
    label: 'FAQ Expansion',
    descriptionTemplate: 'Add FAQ entries to {{pageName}} for common {{service}} questions.',
    taskType: 'content',
    triggerDomain: 'content',
    expectedImpactCategory: 'content_freshness',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Minimum FAQ count is met on the page.',
    defaultDueDays: 10,
    escalationThresholdDays: 5,
    cooldownDays: 60,
    maxOpenPerObject: 1,
  },
  competitor_gap_response: {
    templateKey: 'competitor_gap_response',
    label: 'Competitor Gap Response',
    descriptionTemplate: 'Address competitive gap: {{gapDescription}} at {{location}}.',
    taskType: 'strategy',
    triggerDomain: 'competitive_gap',
    expectedImpactCategory: 'competitive_position',
    systemVerifiable: false,
    proofRequirements: ['action_summary', 'manager_approval'],
    completionDescription: 'Manager confirms gap response actions are complete.',
    defaultDueDays: 14,
    escalationThresholdDays: 7,
    cooldownDays: 30,
    maxOpenPerObject: 1,
  },
  booking_cta_optimization: {
    templateKey: 'booking_cta_optimization',
    label: 'Booking CTA Optimization',
    descriptionTemplate: 'Improve booking CTA on {{pageName}} to increase conversion.',
    taskType: 'conversion',
    triggerDomain: 'conversion',
    expectedImpactCategory: 'booking_conversion',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Booking CTA is present, above fold, and linked to booking flow.',
    defaultDueDays: 7,
    escalationThresholdDays: 5,
    cooldownDays: 30,
    maxOpenPerObject: 1,
  },
  content_refresh: {
    templateKey: 'content_refresh',
    label: 'Content Refresh',
    descriptionTemplate: 'Refresh content on {{pageName}} to improve relevance and freshness.',
    taskType: 'content',
    triggerDomain: 'content',
    expectedImpactCategory: 'content_freshness',
    systemVerifiable: false,
    proofRequirements: ['content_diff', 'manager_approval'],
    completionDescription: 'Updated content is live and approved by manager.',
    defaultDueDays: 14,
    escalationThresholdDays: 7,
    cooldownDays: 60,
    maxOpenPerObject: 1,
  },
  local_landing_page_creation: {
    templateKey: 'local_landing_page_creation',
    label: 'Local Landing Page Creation',
    descriptionTemplate: 'Create a local landing page for {{service}} in {{location}}.',
    taskType: 'page',
    triggerDomain: 'page',
    expectedImpactCategory: 'page_health',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Page exists, passes structural validation, and is linked in navigation.',
    defaultDueDays: 21,
    escalationThresholdDays: 10,
    cooldownDays: 90,
    maxOpenPerObject: 1,
  },
  service_description_rewrite: {
    templateKey: 'service_description_rewrite',
    label: 'Service Description Rewrite',
    descriptionTemplate: 'Rewrite the description for {{service}} at {{location}} to meet word count and keyword targets.',
    taskType: 'content',
    triggerDomain: 'content',
    expectedImpactCategory: 'content_freshness',
    systemVerifiable: true,
    proofRequirements: [],
    completionDescription: 'Description meets minimum word count and includes target keywords.',
    defaultDueDays: 10,
    escalationThresholdDays: 5,
    cooldownDays: 60,
    maxOpenPerObject: 1,
  },
};

export const SEO_TASK_TEMPLATE_LIST = Object.values(SEO_TASK_TEMPLATES);

/**
 * AI-eligible templates: defines which task types support "Do It For Me" content generation.
 */
export const AI_ELIGIBLE_TEMPLATES: Record<string, { label: string; buttonLabel: string }> = {
  faq_expansion: { label: 'Generate FAQs', buttonLabel: 'Generate FAQ Content' },
  gbp_post: { label: 'Generate GBP Post', buttonLabel: 'Generate Post Content' },
  service_description_rewrite: { label: 'Generate Description', buttonLabel: 'Generate Description' },
  review_request: { label: 'Draft Review Request', buttonLabel: 'Draft Message' },
};
