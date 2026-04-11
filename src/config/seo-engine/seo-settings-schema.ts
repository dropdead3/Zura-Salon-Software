/**
 * SEO Engine Settings Schema.
 * Defines the configurable admin settings and their defaults.
 * These override hardcoded config values on a per-org basis.
 */

export interface SEOSettingDef {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'text' | 'boolean';
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  group: 'quotas' | 'cooldowns' | 'thresholds' | 'capacity';
}

export const SEO_SETTINGS_SCHEMA: SEOSettingDef[] = [
  // Quotas
  {
    key: 'review_requests_per_week',
    label: 'Review Requests per Week',
    description: 'Target review requests per high-value service per week',
    type: 'number',
    defaultValue: 3,
    min: 0,
    max: 20,
    group: 'quotas',
  },
  {
    key: 'gbp_posts_per_month',
    label: 'GBP Posts per Month',
    description: 'Target Google Business posts per location per month',
    type: 'number',
    defaultValue: 4,
    min: 0,
    max: 30,
    group: 'quotas',
  },
  {
    key: 'photos_per_service_per_month',
    label: 'Photos per Service Page per Month',
    description: 'Target fresh photos per service page per month',
    type: 'number',
    defaultValue: 2,
    min: 0,
    max: 10,
    group: 'quotas',
  },
  {
    key: 'stylist_contributions_per_month',
    label: 'Stylist Contributions per Month',
    description: 'Target content contributions per eligible stylist per month',
    type: 'number',
    defaultValue: 1,
    min: 0,
    max: 10,
    group: 'quotas',
  },
  // Cooldowns
  {
    key: 'review_request_cooldown_days',
    label: 'Review Request Cooldown',
    description: 'Days between review request tasks for the same service-location',
    type: 'number',
    defaultValue: 3,
    min: 1,
    max: 30,
    group: 'cooldowns',
  },
  {
    key: 'gbp_post_cooldown_days',
    label: 'GBP Post Cooldown',
    description: 'Minimum days between GBP posting tasks',
    type: 'number',
    defaultValue: 7,
    min: 1,
    max: 30,
    group: 'cooldowns',
  },
  {
    key: 'page_refresh_cooldown_days',
    label: 'Page Refresh Cooldown',
    description: 'Minimum days between page refresh tasks',
    type: 'number',
    defaultValue: 14,
    min: 7,
    max: 90,
    group: 'cooldowns',
  },
  {
    key: 'competitor_response_cooldown_days',
    label: 'Competitor Response Cooldown',
    description: 'Minimum days between competitor response tasks',
    type: 'number',
    defaultValue: 7,
    min: 3,
    max: 30,
    group: 'cooldowns',
  },
  // Thresholds
  {
    key: 'min_business_value_threshold',
    label: 'Minimum Business Value',
    description: 'Minimum score (0–1) for an object to qualify for recurring tasks',
    type: 'number',
    defaultValue: 0.2,
    min: 0,
    max: 1,
    group: 'thresholds',
  },
  {
    key: 'campaign_aggressiveness',
    label: 'Campaign Aggressiveness',
    description: 'Controls task generation volume (1 = conservative, 5 = aggressive)',
    type: 'number',
    defaultValue: 3,
    min: 1,
    max: 5,
    group: 'thresholds',
  },
  // Capacity
  {
    key: 'user_task_cap',
    label: 'User Task Cap',
    description: 'Maximum active SEO tasks per user at once',
    type: 'number',
    defaultValue: 10,
    min: 1,
    max: 50,
    group: 'capacity',
  },
];

export const SEO_SETTINGS_GROUPS = [
  { key: 'quotas', label: 'Activity Quotas' },
  { key: 'cooldowns', label: 'Cooldown Windows' },
  { key: 'thresholds', label: 'Thresholds' },
  { key: 'capacity', label: 'Capacity Limits' },
] as const;
