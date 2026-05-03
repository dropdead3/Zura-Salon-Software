/**
 * Reputation Engine → Website Editor bridge.
 *
 * Reads from the `eligible_website_reviews` view (5-star + written + completed
 * appointment) and exposes curation mutations against `website_testimonials`.
 *
 * Original-review protection: curation snapshots the source `comments` into
 * `original_body` so operators can edit the displayed copy without altering
 * the source `client_feedback_responses` row.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { toast } from 'sonner';
import type { DisplayNamePreference } from '@/lib/reviewDisplayName';

/**
 * Pre-flight entitlement guard. Defense-in-depth against direct mutation calls
 * from devtools when the org has not subscribed to Zura Reputation.
 * Source of truth is the `reputation_enabled` flag on `organization_feature_flags`,
 * kept in sync by the `sync_reputation_entitlement` trigger.
 */
async function assertReputationEntitled(orgId: string | undefined) {
  if (!orgId) throw new Error('No organization context');
  const { data, error } = await supabase
    .from('organization_feature_flags')
    .select('is_enabled')
    .eq('organization_id', orgId)
    .eq('flag_key', 'reputation_enabled')
    .maybeSingle();
  if (error) throw error;
  if (!data?.is_enabled) {
    throw new Error('REPUTATION_NOT_ENTITLED');
  }
}

const STALE_TIME_MS = 30_000;

export interface EligibleReview {
  response_id: string;
  organization_id: string;
  client_id: string | null;
  staff_user_id: string | null;
  appointment_id: string | null;
  overall_rating: number | null;
  comments: string | null;
  responded_at: string | null;
  created_at: string;
  display_consent: boolean;
  display_name_preference: DisplayNamePreference | null;
  display_status:
    | 'new'
    | 'eligible'
    | 'approved'
    | 'featured'
    | 'hidden'
    | 'unpublished'
    | 'needs_consent';
  client_first_name: string | null;
  client_last_name: string | null;
  website_testimonial_id: string | null;
  published: boolean | null;
  is_featured: boolean | null;
  feature_scopes: string[] | null;
  service_id: string | null;
  stylist_user_id: string | null;
  location_id: string | null;
}

export interface EligibleReviewFilters {
  search?: string;
  serviceId?: string | null;
  stylistUserId?: string | null;
  locationId?: string | null;
  /** Lifecycle bucket: 'eligible' (not yet curated), 'curated' (published), 'hidden' */
  bucket?: 'eligible' | 'curated' | 'hidden' | 'all';
  dateFrom?: string | null;
  dateTo?: string | null;
}

export function useEligibleReviews(filters: EligibleReviewFilters = {}) {
  const orgId = useSettingsOrgId();
  return useQuery({
    queryKey: ['eligible-website-reviews', orgId, filters],
    enabled: !!orgId,
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      let q = supabase
        // Cast: view not yet typed in generated types.ts (regenerated on next sync).
        .from('eligible_website_reviews' as never)
        .select('*')
        .eq('organization_id', orgId!)
        .order('responded_at', { ascending: false, nullsFirst: false })
        .limit(500);

      if (filters.serviceId) q = q.eq('service_id', filters.serviceId);
      if (filters.stylistUserId) q = q.eq('stylist_user_id', filters.stylistUserId);
      if (filters.locationId) q = q.eq('location_id', filters.locationId);
      if (filters.dateFrom) q = q.gte('responded_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('responded_at', filters.dateTo);

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as unknown as EligibleReview[];

      // Bucket filter (client-side — small dataset, view already trimmed).
      if (filters.bucket && filters.bucket !== 'all') {
        rows = rows.filter((r) => {
          const isCurated = !!r.website_testimonial_id;
          const isPublished = isCurated && r.published === true;
          const isHidden = isCurated && r.published === false;
          if (filters.bucket === 'curated') return isPublished;
          if (filters.bucket === 'hidden') return isHidden;
          if (filters.bucket === 'eligible') return !isCurated;
          return true;
        });
      }

      if (filters.search) {
        const needle = filters.search.toLowerCase();
        rows = rows.filter((r) => {
          const hay = [
            r.comments,
            r.client_first_name,
            r.client_last_name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(needle);
        });
      }

      return rows;
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['eligible-website-reviews'] });
    qc.invalidateQueries({ queryKey: ['website_testimonials'] });
  };
}

export interface CurateReviewInput {
  response: EligibleReview;
  /** Operator override of the displayed name. Optional. */
  displayNameOverride?: string | null;
  /** Required when source review has no captured display_consent. */
  consentOverride?: {
    attestation: string;
  };
}

/**
 * Curate (publish) an eligible review by creating a `website_testimonials`
 * row linked back to the source response. Snapshots `original_body`. Marks
 * the source `display_status` as 'approved' (or 'featured' if already so).
 */
export function useCurateReview() {
  const orgId = useSettingsOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ response, displayNameOverride, consentOverride }: CurateReviewInput) => {
      await assertReputationEntitled(orgId);
      if (!response.comments) throw new Error('Source review has no body');
      if (!response.display_consent && !consentOverride) {
        throw new Error('CONSENT_REQUIRED');
      }

      const auth = await supabase.auth.getUser();
      const userId = auth.data.user?.id ?? null;

      // Title is intentionally empty — operators can edit later if they want
      // a headline; the body is what matters for client-submitted reviews.
      const author = displayNameOverride?.trim() || buildPreviewAuthor(response);

      const { data: inserted, error } = await supabase
        .from('website_testimonials')
        .insert({
          organization_id: orgId,
          surface: 'general',
          title: '',
          author,
          body: response.comments,
          rating: response.overall_rating ?? 5,
          source_response_id: response.response_id,
          original_body: response.comments,
          display_edited: false,
          enabled: true,
          sort_order: 0,
          show_stylist: true,
          show_service: true,
          show_date: true,
          show_rating: true,
          display_name_override: displayNameOverride ?? null,
          stylist_user_id: response.staff_user_id,
        })
        .select()
        .single();
      if (error) throw error;

      // Update source lifecycle status.
      await supabase
        .from('client_feedback_responses')
        .update({
          display_status: 'approved',
          display_status_by: userId,
        })
        .eq('id', response.response_id);

      // Audit row (operator override or normal curation).
      await supabase.from('website_review_audit_log').insert({
        organization_id: orgId,
        response_id: response.response_id,
        testimonial_id: inserted.id,
        action: 'curate',
        consent_override: !!consentOverride,
        override_attestation: consentOverride?.attestation ?? null,
        performed_by: userId,
      });

      return inserted;
    },
    onSuccess: invalidate,
    onError: (e: Error) => {
      if (e.message === 'CONSENT_REQUIRED') return; // surfaced by caller
      toast.error('Failed to publish review: ' + e.message);
    },
  });
}

export function useUnpublishReview() {
  const orgId = useSettingsOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      testimonialId,
      responseId,
    }: {
      testimonialId: string;
      responseId: string | null;
    }) => {
      await assertReputationEntitled(orgId);
      const { error } = await supabase
        .from('website_testimonials')
        .update({ enabled: false })
        .eq('id', testimonialId);
      if (error) throw error;
      if (responseId) {
        await supabase
          .from('client_feedback_responses')
          .update({ display_status: 'unpublished' })
          .eq('id', responseId);
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to unpublish: ' + e.message),
  });
}

export function useFeatureReview() {
  const orgId = useSettingsOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      testimonialId,
      isFeatured,
      scopes,
    }: {
      testimonialId: string;
      isFeatured: boolean;
      scopes?: string[];
    }) => {
      await assertReputationEntitled(orgId);
      const { error } = await supabase
        .from('website_testimonials')
        .update({
          is_featured: isFeatured,
          feature_scopes: scopes ?? (isFeatured ? ['homepage'] : []),
        })
        .eq('id', testimonialId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to feature: ' + e.message),
  });
}

export function useUpdateDisplayCopy() {
  const orgId = useSettingsOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      testimonialId,
      body,
      displayNameOverride,
    }: {
      testimonialId: string;
      body?: string;
      displayNameOverride?: string | null;
    }) => {
      await assertReputationEntitled(orgId);
      const updates: Record<string, unknown> = {};
      if (body !== undefined) {
        updates.body = body;
        updates.display_edited = true;
      }
      if (displayNameOverride !== undefined) {
        updates.display_name_override = displayNameOverride;
        updates.author = displayNameOverride || 'Anonymous';
      }
      if (Object.keys(updates).length === 0) return;
      const { error } = await supabase
        .from('website_testimonials')
        .update(updates)
        .eq('id', testimonialId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to update display copy: ' + e.message),
  });
}

export function useHideReview() {
  const orgId = useSettingsOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ responseId }: { responseId: string }) => {
      await assertReputationEntitled(orgId);
      const { error } = await supabase
        .from('client_feedback_responses')
        .update({ display_status: 'hidden' })
        .eq('id', responseId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to hide: ' + e.message),
  });
}

// Helper: build a default author label from the source review.
function buildPreviewAuthor(r: EligibleReview): string {
  const first = (r.client_first_name ?? '').trim();
  const last = (r.client_last_name ?? '').trim();
  switch (r.display_name_preference) {
    case 'anonymous':
      return 'Anonymous';
    case 'first_only':
      return first || 'Anonymous';
    case 'first_initial':
      return last ? `${first} ${last[0].toUpperCase()}.` : first || 'Anonymous';
    default:
      if (!first && !last) return 'Anonymous';
      return last ? `${first} ${last[0].toUpperCase()}.` : first;
  }
}
