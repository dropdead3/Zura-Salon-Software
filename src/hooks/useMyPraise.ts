/**
 * useMyPraise — self-scoped praise feed for the stylist dashboard.
 *
 * Stylist Privacy Contract: filters strictly by `staff_user_id = auth.uid()`.
 * No peer rosters, no org-wide aggregates — only the authenticated stylist's
 * own client praise from the last 90 days.
 *
 * Surfaces 5-star (or NPS 9-10) responses with substantive written comments.
 * Pure morale + coaching reinforcement.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface MyPraiseItem {
  id: string;
  overall_rating: number | null;
  nps_score: number | null;
  comments: string;
  responded_at: string | null;
  appointment_id: string | null;
}

const MIN_COMMENT_LEN = 20;

export function useMyPraise(limit = 12) {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const userId = user?.id;

  return useQuery({
    queryKey: ['my-praise', orgId, userId, limit],
    enabled: !!orgId && !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<MyPraiseItem[]> => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('client_feedback_responses')
        .select('id, overall_rating, nps_score, comments, responded_at, appointment_id')
        .eq('organization_id', orgId!)
        .eq('staff_user_id', userId!)
        .gte('created_at', since)
        .not('comments', 'is', null)
        .order('responded_at', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;

      const isPraise = (r: { overall_rating: number | null; nps_score: number | null }) =>
        (r.overall_rating ?? 0) >= 5 || (r.nps_score ?? 0) >= 9;

      return ((data ?? []) as MyPraiseItem[])
        .filter((r) => isPraise(r) && (r.comments?.trim().length ?? 0) >= MIN_COMMENT_LEN)
        .slice(0, limit);
    },
  });
}
