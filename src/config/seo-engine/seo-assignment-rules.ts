/**
 * SEO Task Assignment Rules.
 *
 * Deterministic role-routing per task type with fallback chains.
 * AI never determines who a task is assigned to.
 */

export type AssignableRole =
  | 'stylist'
  | 'front_desk'
  | 'content_coordinator'
  | 'marketing_admin'
  | 'manager'
  | 'owner';

export interface AssignmentRule {
  /** Primary assignee role */
  primaryRole: AssignableRole;
  /** Fallback chain if primary is unavailable */
  fallbackChain: AssignableRole[];
  /** If true, assign to the stylist who performed the service (context-dependent) */
  assignToServiceProvider: boolean;
  /** Human-readable explanation */
  description: string;
}

/**
 * Assignment rules keyed by task template key.
 */
export const SEO_ASSIGNMENT_RULES: Record<string, AssignmentRule> = {
  review_request: {
    primaryRole: 'stylist',
    fallbackChain: ['front_desk', 'manager'],
    assignToServiceProvider: true,
    description: 'Routes to the stylist who performed the service, or front desk if unavailable.',
  },
  review_response: {
    primaryRole: 'manager',
    fallbackChain: ['owner'],
    assignToServiceProvider: false,
    description: 'Routes to manager or owner for professional review responses.',
  },
  photo_upload: {
    primaryRole: 'stylist',
    fallbackChain: ['content_coordinator', 'manager'],
    assignToServiceProvider: true,
    description: 'Routes to the stylist who performed the service, or content coordinator.',
  },
  gbp_post: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin, then manager, then owner.',
  },
  service_page_update: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for page content management.',
  },
  page_completion: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for new page creation.',
  },
  metadata_fix: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for technical SEO fixes.',
  },
  internal_linking: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for site architecture work.',
  },
  before_after_publish: {
    primaryRole: 'stylist',
    fallbackChain: ['content_coordinator', 'marketing_admin', 'manager'],
    assignToServiceProvider: true,
    description: 'Routes to stylist for transformation content, then content team.',
  },
  stylist_spotlight_publish: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin to create/update stylist pages.',
  },
  faq_expansion: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for FAQ content creation.',
  },
  competitor_gap_response: {
    primaryRole: 'manager',
    fallbackChain: ['owner'],
    assignToServiceProvider: false,
    description: 'Strategic response — routes to manager or owner.',
  },
  booking_cta_optimization: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for conversion optimization.',
  },
  content_refresh: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for content updates.',
  },
  local_landing_page_creation: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for new page creation.',
  },
  service_description_rewrite: {
    primaryRole: 'marketing_admin',
    fallbackChain: ['manager', 'owner'],
    assignToServiceProvider: false,
    description: 'Routes to marketing admin for content rewriting.',
  },
};
