import { supabase } from '@/integrations/supabase/client';

export interface ResolvedReviewLinks {
  google: string;
  apple: string;
  yelp: string;
  facebook: string;
  custom: string;
  customLabel: string;
  priority: string[];
}

const EMPTY: ResolvedReviewLinks = {
  google: '', apple: '', yelp: '', facebook: '', custom: '', customLabel: '',
  priority: ['google', 'apple', 'yelp', 'facebook'],
};

/**
 * Resolve public review URLs for a feedback context.
 * Order of precedence (per-field): location_review_settings → org-level review_threshold_settings → empty.
 */
export async function resolveReviewLinks(
  organizationId: string,
  locationId?: string | null,
): Promise<ResolvedReviewLinks> {
  // Org-level fallback
  const { data: orgRow } = await supabase
    .from('site_settings')
    .select('value')
    .eq('id', 'review_threshold_settings')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const org = (orgRow?.value ?? {}) as Record<string, string | undefined>;

  let loc: Record<string, unknown> = {};
  if (locationId) {
    const { data: locRow } = await supabase
      .from('location_review_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('location_id', locationId)
      .maybeSingle();
    loc = (locRow ?? {}) as Record<string, unknown>;
  }

  const pick = (locKey: string, orgKey: string): string =>
    (loc[locKey] as string | null | undefined) || org[orgKey] || '';

  return {
    google: pick('google_review_url', 'googleReviewUrl'),
    apple: pick('apple_review_url', 'appleReviewUrl'),
    yelp: pick('yelp_review_url', 'yelpReviewUrl'),
    facebook: pick('facebook_review_url', 'facebookReviewUrl'),
    custom: (loc.custom_review_url as string) || '',
    customLabel: (loc.custom_review_label as string) || 'Leave a Review',
    priority: (loc.default_platform_priority as string[]) || EMPTY.priority,
  };
}
