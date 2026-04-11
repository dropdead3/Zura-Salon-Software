/**
 * SEO Health Domain definitions.
 * Each domain produces a 0–100 score for eligible SEO objects.
 */

export type SEOHealthDomain =
  | 'review'
  | 'page'
  | 'local_presence'
  | 'content'
  | 'competitive_gap'
  | 'conversion';

export interface HealthDomainDefinition {
  domain: SEOHealthDomain;
  label: string;
  description: string;
  /** Which seo_object_types this domain applies to */
  applicableObjectTypes: string[];
  /** Signal keys that compose this domain score */
  signalKeys: string[];
}

export const SEO_HEALTH_DOMAINS: Record<SEOHealthDomain, HealthDomainDefinition> = {
  review: {
    domain: 'review',
    label: 'Review Health',
    description: 'Review velocity, keyword coverage in reviews, freshness, and sentiment',
    applicableObjectTypes: ['location', 'location_service', 'stylist_page', 'review_stream'],
    signalKeys: [
      'review_velocity_30d',
      'review_keyword_coverage',
      'review_freshness_days',
      'review_average_rating',
      'review_response_rate',
      'stylist_name_mention_rate',
    ],
  },
  page: {
    domain: 'page',
    label: 'Page Health',
    description: 'Structural completeness, metadata, alt tags, internal links, and content depth',
    applicableObjectTypes: ['website_page', 'stylist_page', 'location_service'],
    signalKeys: [
      'has_meta_title',
      'has_meta_description',
      'meta_title_length_ok',
      'meta_description_length_ok',
      'has_h1',
      'image_count',
      'images_with_alt',
      'internal_link_count',
      'word_count',
      'has_faq_section',
      'has_cta',
      'has_schema_markup',
    ],
  },
  local_presence: {
    domain: 'local_presence',
    label: 'Local Presence Health',
    description: 'GBP completeness, posting cadence, photo freshness, and service data',
    applicableObjectTypes: ['location', 'gbp_listing'],
    signalKeys: [
      'gbp_claimed',
      'gbp_hours_complete',
      'gbp_categories_set',
      'gbp_description_length',
      'gbp_photo_count',
      'gbp_photo_freshness_days',
      'gbp_post_cadence_days',
      'gbp_service_list_complete',
      'gbp_attributes_filled',
      'nap_consistency',
    ],
  },
  content: {
    domain: 'content',
    label: 'Content Health',
    description: 'Service descriptions, stylist spotlights, transformations, and FAQ depth',
    applicableObjectTypes: ['location_service', 'stylist_page', 'website_page'],
    signalKeys: [
      'service_description_word_count',
      'has_before_after_photos',
      'before_after_photo_count',
      'stylist_spotlight_exists',
      'stylist_bio_word_count',
      'faq_count',
      'local_content_depth',
      'content_freshness_days',
    ],
  },
  competitive_gap: {
    domain: 'competitive_gap',
    label: 'Competitive Gap Health',
    description: 'Review velocity gaps, keyword presence gaps, and proof-density gaps vs competitors',
    applicableObjectTypes: ['location', 'location_service', 'competitor'],
    signalKeys: [
      'competitor_review_velocity_gap',
      'competitor_keyword_presence_gap',
      'competitor_proof_density_gap',
      'competitor_rating_gap',
      'competitor_content_depth_gap',
    ],
  },
  conversion: {
    domain: 'conversion',
    label: 'Conversion Health',
    description: 'Traffic-to-booking conversion, CTA strength, and booking flow friction',
    applicableObjectTypes: ['website_page', 'location_service', 'location'],
    signalKeys: [
      'page_traffic_30d',
      'booking_conversion_rate',
      'has_booking_cta',
      'cta_above_fold',
      'cta_click_rate',
      'bounce_rate',
      'avg_time_on_page',
    ],
  },
};

export const HEALTH_DOMAIN_LIST = Object.values(SEO_HEALTH_DOMAINS);
