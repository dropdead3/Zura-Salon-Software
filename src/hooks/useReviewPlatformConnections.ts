/**
 * useReviewPlatformConnections — Read-only hook over `review_platform_connections`.
 * Mutations (Connect / Disconnect) are deferred until the OAuth edge functions
 * land in P2.1 / P2.2.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type ReviewPlatform = 'google' | 'facebook';
export type ReviewConnectionStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'revoked'
  | 'error';

export interface ReviewPlatformConnection {
  id: string;
  organization_id: string;
  location_id: string | null;
  platform: ReviewPlatform;
  status: ReviewConnectionStatus;
  external_account_id: string | null;
  external_account_label: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  cached_review_count: number | null;
  cached_average_rating: number | null;
}

export function useReviewPlatformConnections() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['review-platform-connections', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<ReviewPlatformConnection[]> => {
      const { data, error } = await supabase
        .from('review_platform_connections')
        .select(
          'id, organization_id, location_id, platform, status, external_account_id, external_account_label, last_synced_at, last_error, cached_review_count, cached_average_rating',
        )
        .eq('organization_id', orgId!);
      if (error) throw error;
      return (data ?? []) as ReviewPlatformConnection[];
    },
  });
}
