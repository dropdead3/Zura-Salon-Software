import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface PraiseItem {
  id: string;
  overall_rating: number | null;
  nps_score: number | null;
  comments: string;
  responded_at: string | null;
  staff_user_id: string | null;
  client_id: string | null;
  appointment_id: string | null;
}

const MIN_COMMENT_LEN = 20;

/**
 * Praise Wall — surfaces 5-star (or NPS 9-10) responses with substantive
 * written comments. Pure morale fuel for the team.
 */
export function usePraiseWall(limit = 12, locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const locFilter = locationId && locationId !== 'all' ? locationId : undefined;

  return useQuery({
    queryKey: ['praise-wall', orgId, limit, locFilter ?? 'all'],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<PraiseItem[]> => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      let q = supabase
        .from('client_feedback_responses')
        .select('id, overall_rating, nps_score, comments, responded_at, staff_user_id, client_id, appointment_id')
        .eq('organization_id', orgId!)
        .gte('created_at', since)
        .not('comments', 'is', null)
        .order('responded_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (locFilter) q = q.eq('location_id', locFilter);
      const { data, error } = await q;

      if (error) throw error;

      const isPraise = (r: { overall_rating: number | null; nps_score: number | null }) =>
        (r.overall_rating ?? 0) >= 5 || (r.nps_score ?? 0) >= 9;

      return ((data ?? []) as PraiseItem[])
        .filter((r) => isPraise(r) && (r.comments?.trim().length ?? 0) >= MIN_COMMENT_LEN)
        .slice(0, limit);
    },
  });
}
