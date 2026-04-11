/**
 * SEO Quota definitions.
 *
 * Quota-driven recurring behavior replaces naive endless recurrence.
 * Quotas define target activity levels per object type per time window.
 */

export type QuotaPeriod = 'weekly' | 'monthly';

export interface SEOQuota {
  key: string;
  label: string;
  period: QuotaPeriod;
  /** Default target count per period */
  defaultTarget: number;
  /** Which task template this quota drives */
  templateKey: string;
  /** Which SEO object type this quota applies to */
  objectType: string;
  /** Whether this quota scales by business value */
  scalesByBusinessValue: boolean;
  description: string;
}

export const SEO_QUOTAS: Record<string, SEOQuota> = {
  review_requests_per_high_value_service: {
    key: 'review_requests_per_high_value_service',
    label: 'Review Requests per High-Value Service',
    period: 'weekly',
    defaultTarget: 3,
    templateKey: 'review_request',
    objectType: 'location_service',
    scalesByBusinessValue: true,
    description: 'Weekly review request target per high-value service-location pair.',
  },
  gbp_posts_per_location: {
    key: 'gbp_posts_per_location',
    label: 'GBP Posts per Location',
    period: 'monthly',
    defaultTarget: 4,
    templateKey: 'gbp_post',
    objectType: 'location',
    scalesByBusinessValue: false,
    description: 'Monthly GBP posting target per location.',
  },
  photo_freshness_per_service_page: {
    key: 'photo_freshness_per_service_page',
    label: 'Photo Freshness per Service Page',
    period: 'monthly',
    defaultTarget: 2,
    templateKey: 'photo_upload',
    objectType: 'location_service',
    scalesByBusinessValue: false,
    description: 'Monthly photo freshness target per service page.',
  },
  stylist_contributions: {
    key: 'stylist_contributions',
    label: 'Stylist Contributions',
    period: 'monthly',
    defaultTarget: 1,
    templateKey: 'before_after_publish',
    objectType: 'stylist_page',
    scalesByBusinessValue: false,
    description: 'Monthly content contribution target for eligible stylists.',
  },
};

export const SEO_QUOTA_LIST = Object.values(SEO_QUOTAS);

/**
 * Max SEO tasks a single user can have in active states at once.
 * Prevents overload and fatigue.
 */
export const DEFAULT_USER_TASK_CAP = 10;

/**
 * Min business value score (0–1) for an object to be eligible for recurring tasks.
 */
export const MIN_BUSINESS_VALUE_THRESHOLD = 0.2;
