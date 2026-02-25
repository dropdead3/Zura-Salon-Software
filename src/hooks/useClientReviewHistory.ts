import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientReview {
  responded_at: string;
  overall_rating: number | null;
  nps_score: number | null;
  comments: string | null;
  appointment_id: string | null;
}

export interface ClientReviewSummary {
  reviews: ClientReview[];
  totalReviews: number;
  averageRating: number | null;
  lastReviewDate: string | null;
}

export function useClientReviewHistory(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-reviews', clientId],
    queryFn: async (): Promise<ClientReviewSummary> => {
      const { data, error } = await supabase
        .from('client_feedback_responses')
        .select('responded_at, overall_rating, nps_score, comments, appointment_id')
        .eq('client_id', clientId!)
        .not('responded_at', 'is', null)
        .order('responded_at', { ascending: false });

      if (error) throw error;

      const reviews = (data || []) as ClientReview[];
      const ratings = reviews
        .map((r) => r.overall_rating)
        .filter((r): r is number => r !== null);

      return {
        reviews,
        totalReviews: reviews.length,
        averageRating: ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null,
        lastReviewDate: reviews[0]?.responded_at || null,
      };
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}
