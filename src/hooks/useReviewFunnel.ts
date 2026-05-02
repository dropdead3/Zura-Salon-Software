import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ReviewFunnelStats {
  sent: number;
  responded: number;
  responseRate: number | null;        // responded / sent
  publicReviewClicks: number;
  publicConversionRate: number | null; // clicks / responded
  promoters: number;
  hasResponseSignal: boolean;          // ≥10 sent
  hasConversionSignal: boolean;        // ≥5 responded
}

const MIN_SENT_FOR_RATE = 10;
const MIN_RESPONDED_FOR_CONVERSION = 5;

/**
 * Review request funnel metrics: how many we asked, how many replied,
 * how many promoters clicked through to a public review.
 *
 * Signal-suppressed below thresholds (visibility contract).
 */
export function useReviewFunnel(daysBack = 30) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['review-funnel', orgId, daysBack],
    queryFn: async (): Promise<ReviewFunnelStats> => {
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('client_feedback_responses' as any)
        .select('responded_at, nps_score, external_review_clicked, created_at')
        .eq('organization_id', orgId!)
        .gte('created_at', since)
        .limit(5000);
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        responded_at: string | null;
        nps_score: number | null;
        external_review_clicked: string | null;
        created_at: string;
      }>;

      const sent = rows.length;
      const respondedRows = rows.filter(r => r.responded_at != null);
      const responded = respondedRows.length;
      const promoters = respondedRows.filter(r => (r.nps_score ?? 0) >= 9).length;
      const publicReviewClicks = respondedRows.filter(r => r.external_review_clicked != null).length;

      const hasResponseSignal = sent >= MIN_SENT_FOR_RATE;
      const hasConversionSignal = responded >= MIN_RESPONDED_FOR_CONVERSION;

      return {
        sent,
        responded,
        responseRate: hasResponseSignal ? responded / sent : null,
        publicReviewClicks,
        publicConversionRate: hasConversionSignal ? publicReviewClicks / responded : null,
        promoters,
        hasResponseSignal,
        hasConversionSignal,
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
