/**
 * SEO Problem Type definitions.
 * Each problem type maps to a health domain, has a default severity,
 * and references the template_key of the task it generates.
 */

import type { SEOHealthDomain } from './seo-health-domains';

export interface SEOProblemType {
  key: string;
  label: string;
  domain: SEOHealthDomain;
  /** Default severity weight (0–1) used in priority calculation */
  defaultSeverity: number;
  /** The task template(s) this problem triggers */
  triggersTemplates: string[];
  /** Human-readable description of what this problem means */
  description: string;
}

export const SEO_PROBLEM_TYPES: Record<string, SEOProblemType> = {
  low_review_velocity: {
    key: 'low_review_velocity',
    label: 'Low Review Velocity',
    domain: 'review',
    defaultSeverity: 0.8,
    triggersTemplates: ['review_request'],
    description: 'Fewer new reviews than target for this location-service pair.',
  },
  low_keyword_coverage_reviews: {
    key: 'low_keyword_coverage_reviews',
    label: 'Low Keyword Coverage in Reviews',
    domain: 'review',
    defaultSeverity: 0.6,
    triggersTemplates: ['review_request'],
    description: 'Reviews lack mentions of target service keywords.',
  },
  stale_reviews: {
    key: 'stale_reviews',
    label: 'Stale Reviews',
    domain: 'review',
    defaultSeverity: 0.5,
    triggersTemplates: ['review_request'],
    description: 'Most recent reviews are older than freshness threshold.',
  },
  missing_service_pages: {
    key: 'missing_service_pages',
    label: 'Missing Service Pages',
    domain: 'page',
    defaultSeverity: 0.9,
    triggersTemplates: ['local_landing_page_creation', 'page_completion'],
    description: 'High-value service has no dedicated page on the website.',
  },
  thin_content: {
    key: 'thin_content',
    label: 'Thin Content',
    domain: 'content',
    defaultSeverity: 0.7,
    triggersTemplates: ['service_description_rewrite', 'content_refresh'],
    description: 'Page content is below minimum word count for effective SEO.',
  },
  missing_photos: {
    key: 'missing_photos',
    label: 'Missing Photos',
    domain: 'content',
    defaultSeverity: 0.6,
    triggersTemplates: ['photo_upload', 'before_after_publish'],
    description: 'Service page or listing lacks sufficient photos.',
  },
  missing_alt_tags: {
    key: 'missing_alt_tags',
    label: 'Missing Alt Tags',
    domain: 'page',
    defaultSeverity: 0.4,
    triggersTemplates: ['metadata_fix'],
    description: 'Images on the page lack descriptive alt text.',
  },
  weak_metadata: {
    key: 'weak_metadata',
    label: 'Weak Metadata',
    domain: 'page',
    defaultSeverity: 0.7,
    triggersTemplates: ['metadata_fix'],
    description: 'Meta title or description is missing, too short, or generic.',
  },
  missing_faqs: {
    key: 'missing_faqs',
    label: 'Missing FAQs',
    domain: 'content',
    defaultSeverity: 0.5,
    triggersTemplates: ['faq_expansion'],
    description: 'Page lacks FAQ section or has fewer than minimum FAQ count.',
  },
  missing_internal_links: {
    key: 'missing_internal_links',
    label: 'Missing Internal Links',
    domain: 'page',
    defaultSeverity: 0.5,
    triggersTemplates: ['internal_linking'],
    description: 'Page has fewer than target internal links to related content.',
  },
  stale_gbp_posting: {
    key: 'stale_gbp_posting',
    label: 'Stale GBP Posting',
    domain: 'local_presence',
    defaultSeverity: 0.7,
    triggersTemplates: ['gbp_post'],
    description: 'Google Business Profile has not posted within cadence window.',
  },
  stale_gbp_photos: {
    key: 'stale_gbp_photos',
    label: 'Stale GBP Photos',
    domain: 'local_presence',
    defaultSeverity: 0.5,
    triggersTemplates: ['photo_upload'],
    description: 'GBP listing photos are outdated.',
  },
  incomplete_gbp_services: {
    key: 'incomplete_gbp_services',
    label: 'Incomplete GBP Service Data',
    domain: 'local_presence',
    defaultSeverity: 0.6,
    triggersTemplates: ['service_page_update'],
    description: 'GBP listing is missing services or pricing info.',
  },
  missing_local_content: {
    key: 'missing_local_content',
    label: 'Missing Local Content',
    domain: 'content',
    defaultSeverity: 0.6,
    triggersTemplates: ['local_landing_page_creation', 'content_refresh'],
    description: 'No locally-targeted content for this location-service pair.',
  },
  weak_stylist_spotlight: {
    key: 'weak_stylist_spotlight',
    label: 'Weak Stylist Spotlight Coverage',
    domain: 'content',
    defaultSeverity: 0.5,
    triggersTemplates: ['stylist_spotlight_publish'],
    description: 'Stylist page is missing or has insufficient bio and proof content.',
  },
  weak_transformation_content: {
    key: 'weak_transformation_content',
    label: 'Weak Transformation Content',
    domain: 'content',
    defaultSeverity: 0.5,
    triggersTemplates: ['before_after_publish'],
    description: 'Insufficient before/after transformation proof for this service.',
  },
  competitor_review_velocity_gap: {
    key: 'competitor_review_velocity_gap',
    label: 'Competitor Review Velocity Gap',
    domain: 'competitive_gap',
    defaultSeverity: 0.7,
    triggersTemplates: ['competitor_gap_response', 'review_request'],
    description: 'Competitors are receiving reviews at a faster rate.',
  },
  competitor_keyword_presence_gap: {
    key: 'competitor_keyword_presence_gap',
    label: 'Competitor Keyword Presence Gap',
    domain: 'competitive_gap',
    defaultSeverity: 0.6,
    triggersTemplates: ['competitor_gap_response', 'content_refresh'],
    description: 'Competitors rank for target keywords this location does not.',
  },
  competitor_proof_density_gap: {
    key: 'competitor_proof_density_gap',
    label: 'Competitor Proof-Density Gap',
    domain: 'competitive_gap',
    defaultSeverity: 0.5,
    triggersTemplates: ['competitor_gap_response', 'before_after_publish', 'photo_upload'],
    description: 'Competitors have more visual proof content for this service.',
  },
  traffic_low_booking_conversion: {
    key: 'traffic_low_booking_conversion',
    label: 'Traffic with Low Booking Conversion',
    domain: 'conversion',
    defaultSeverity: 0.8,
    triggersTemplates: ['booking_cta_optimization'],
    description: 'Page receives traffic but converts at below-target rate.',
  },
  booking_cta_weakness: {
    key: 'booking_cta_weakness',
    label: 'Booking CTA Weakness',
    domain: 'conversion',
    defaultSeverity: 0.6,
    triggersTemplates: ['booking_cta_optimization'],
    description: 'Booking call-to-action is missing, below fold, or unclear.',
  },
  unresponded_reviews: {
    key: 'unresponded_reviews',
    label: 'Unresponded Reviews',
    domain: 'review',
    defaultSeverity: 0.7,
    triggersTemplates: ['review_response'],
    description: 'Reviews are awaiting a response from the business.',
  },
};

export const SEO_PROBLEM_TYPE_LIST = Object.values(SEO_PROBLEM_TYPES);
